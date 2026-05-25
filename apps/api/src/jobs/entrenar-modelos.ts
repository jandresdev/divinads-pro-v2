// ---------------------------------------------------------------------------
// Job de generación de predicciones ML para DivinADS
// "Entrenamiento" = calcular regresiones sobre datos históricos y persistir resultados
// Se ejecuta cada 48h para mantener predicciones frescas sin sobrecargar la BD
// ---------------------------------------------------------------------------

import { format } from 'date-fns'
import { supabaseAdmin } from '../db/supabase'
import { predecirROAS } from '../services/modelo-prediccion'
import logger from '../utils/logger'

// Versión semántica del modelo — cambiar al modificar el algoritmo
const VERSION_MODELO = '1.0.0-linear-regression'

// ---------------------------------------------------------------------------
// Helpers privados
// ---------------------------------------------------------------------------

/**
 * Obtener el historial de ROAS diario de una campaña en los últimos 30 días.
 * Ordena los datos de más antiguo a más reciente para la regresión temporal.
 *
 * @param tenantId   - ID del tenant propietario de la campaña
 * @param campaignId - ID de la campaña a consultar
 * @returns Array de valores ROAS (solo días con datos válidos > 0)
 */
async function obtenerHistoricoROAS(tenantId: string, campaignId: string): Promise<number[]> {
  // Ventana de 30 días hacia atrás desde hoy
  const hace30Dias = new Date()
  hace30Dias.setDate(hace30Dias.getDate() - 30)
  const fechaLimite = hace30Dias.toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('daily_metrics')
    .select('fecha, roas')
    .eq('tenant_id', tenantId)
    .eq('campaign_id', campaignId)
    .gte('fecha', fechaLimite)
    .order('fecha', { ascending: true })

  if (error || !data) {
    logger.warn(
      { error, tenantId, campaignId },
      'No se pudo obtener historial ROAS para la campaña',
    )
    return []
  }

  // Filtrar filas con ROAS nulo o cero (días sin datos reales)
  return data.map(m => m.roas ?? 0).filter(r => r > 0)
}

// ---------------------------------------------------------------------------
// Job principal
// ---------------------------------------------------------------------------

/**
 * Generar predicciones de ROAS para todas las campañas con snapshot del día de hoy.
 * Este job recorre los feature_snapshots, calcula la predicción con el modelo
 * de regresión lineal y guarda el resultado en la tabla `predictions` de Supabase.
 *
 * Se usa UPSERT con conflicto en (tenant_id, campaign_id, fecha_prediccion)
 * para que múltiples ejecuciones en el mismo día actualicen la predicción existente.
 */
export async function jobEntrenarModelos(): Promise<void> {
  logger.info('Iniciando ciclo de predicciones ML')
  const inicio = Date.now()

  // Usar la fecha de hoy como clave de la predicción
  const hoy = format(new Date(), 'yyyy-MM-dd')

  // Obtener todos los feature snapshots generados hoy
  const { data: snapshots, error } = await supabaseAdmin
    .from('feature_snapshots')
    .select('tenant_id, campaign_id, features')
    .eq('fecha', hoy)

  if (error) {
    logger.error({ error }, 'Error al obtener feature snapshots — abortando ciclo de predicciones')
    return
  }

  if (!snapshots?.length) {
    logger.info(
      { fecha: hoy },
      'No hay feature snapshots disponibles para hoy — se omite el ciclo de predicciones',
    )
    return
  }

  logger.info(
    { totalSnapshots: snapshots.length, fecha: hoy },
    `Procesando predicciones para ${snapshots.length} campaña(s)`,
  )

  let prediccionesGeneradas = 0
  let erroresOmitidos       = 0

  for (const snapshot of snapshots) {
    try {
      const features = (snapshot.features as Record<string, number>) ?? {}

      // Recuperar historial de ROAS desde daily_metrics
      const historicoRoas = await obtenerHistoricoROAS(snapshot.tenant_id, snapshot.campaign_id)

      // Calcular predicción usando el modelo de regresión lineal
      const prediccion = predecirROAS(historicoRoas, features)

      // Persistir resultado en Supabase — upsert para idempotencia
      const { error: insertError } = await supabaseAdmin
        .from('predictions')
        .upsert(
          {
            tenant_id:        snapshot.tenant_id,
            campaign_id:      snapshot.campaign_id,
            fecha_prediccion: hoy,
            roas_predicho:    prediccion.roasPredicho,
            confianza:        prediccion.confianza,
            tendencia:        prediccion.tendencia,
            explicacion:      prediccion.explicacion,
            modelo_version:   VERSION_MODELO,
            features_usados:  features,
            updated_at:       new Date().toISOString(),
          },
          {
            // Actualizar si ya existe predicción para esta campaña en este día
            onConflict: 'tenant_id,campaign_id,fecha_prediccion',
          },
        )

      if (insertError) {
        logger.warn(
          { error: insertError, campaignId: snapshot.campaign_id, tenantId: snapshot.tenant_id },
          'Error al guardar predicción — se omite esta campaña',
        )
        erroresOmitidos++
      } else {
        prediccionesGeneradas++
        logger.debug(
          {
            campaignId:  snapshot.campaign_id,
            roasPredicho: prediccion.roasPredicho.toFixed(2),
            confianza:   prediccion.confianza,
            tendencia:   prediccion.tendencia,
          },
          'Predicción generada y guardada',
        )
      }
    } catch (error) {
      // Capturar cualquier error inesperado para que el ciclo continúe con las demás campañas
      logger.error(
        { error, campaignId: snapshot.campaign_id, tenantId: snapshot.tenant_id },
        'Error no esperado al generar predicción — se omite esta campaña',
      )
      erroresOmitidos++
    }
  }

  logger.info(
    {
      prediccionesGeneradas,
      erroresOmitidos,
      totalSnapshots:  snapshots.length,
      duracionMs:      Date.now() - inicio,
      modeloVersion:   VERSION_MODELO,
      fecha:           hoy,
    },
    'Ciclo de predicciones ML completado',
  )
}
