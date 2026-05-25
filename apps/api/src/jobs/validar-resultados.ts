import { supabaseAdmin } from '../db/supabase'
import logger from '../utils/logger'

// ---------------------------------------------------------------------------
// Constantes del ciclo de validación
// ---------------------------------------------------------------------------

// Horas que deben pasar desde la ejecución de una acción para validar su resultado
const HORAS_VALIDACION = 48

// ---------------------------------------------------------------------------
// Job de validación de resultados (ciclo de feedback de 48h)
// ---------------------------------------------------------------------------

/**
 * Job que valida el impacto de las acciones ejecutadas después de 48 horas.
 * Compara el ROAS antes y después de la acción para determinar si fue efectiva.
 * Registra el resultado de la validación en la tabla agent_actions.
 * Corre cada 6 horas — solo procesa acciones que superaron la ventana de 48h.
 */
export async function jobValidarResultados(): Promise<void> {
  logger.info('Iniciando validación de resultados de acciones ejecutadas')
  const inicio = Date.now()

  // Calcular la fecha límite: solo se validan acciones ejecutadas hace más de 48h
  const fechaLimite = new Date()
  fechaLimite.setHours(fechaLimite.getHours() - HORAS_VALIDACION)

  // Obtener acciones ejecutadas que ya superaron la ventana de validación y aún no fueron validadas
  const { data: acciones, error } = await supabaseAdmin
    .from('agent_actions')
    .select('id, tenant_id, campaign_id, tipo_accion, ejecutada_at, confianza')
    .eq('estado', 'ejecutada')
    .is('validada_at', null)                          // Solo las que no fueron validadas aún
    .lte('ejecutada_at', fechaLimite.toISOString())   // Ejecutadas hace más de 48h
    .limit(10)                                         // Máximo 10 validaciones por ciclo

  if (error) {
    logger.error({ error }, 'Error al obtener acciones pendientes de validación')
    return
  }

  if (!acciones?.length) {
    logger.debug('No hay acciones pendientes de validación en este ciclo')
    return
  }

  logger.info({ cantidad: acciones.length }, `Validando ${acciones.length} acciones ejecutadas`)

  for (const accion of acciones) {
    try {
      const fechaEjecucion = new Date(accion.ejecutada_at!)

      // Calcular el día anterior a la ejecución para las métricas de referencia (estado "antes")
      const fechaAntes = new Date(fechaEjecucion)
      fechaAntes.setDate(fechaAntes.getDate() - 1)
      const fechaAntesStr = fechaAntes.toISOString().split('T')[0]

      // Obtener métricas del día anterior a la ejecución — estado de referencia
      const { data: metricasAntes } = await supabaseAdmin
        .from('daily_metrics')
        .select('roas, conversiones, gasto_centavos')
        .eq('campaign_id', accion.campaign_id)
        .eq('fecha', fechaAntesStr)
        .single()

      // Obtener las métricas más recientes desde la fecha de ejecución — estado "después"
      const fechaEjecucionStr = fechaEjecucion.toISOString().split('T')[0]
      const { data: metricasDespues } = await supabaseAdmin
        .from('daily_metrics')
        .select('roas, conversiones, gasto_centavos')
        .eq('campaign_id', accion.campaign_id)
        .gte('fecha', fechaEjecucionStr)
        .order('fecha', { ascending: false })
        .limit(1)
        .single()

      // Comparar ROAS para determinar si la acción fue efectiva
      const roas_antes = metricasAntes?.roas ?? 0
      const roas_despues = metricasDespues?.roas ?? 0

      // Se considera que la acción fue efectiva si el ROAS mejoró o se mantuvo estable (margen 5%)
      const mejoro = roas_despues > roas_antes * 0.95

      // Calcular el cambio porcentual del ROAS
      const cambioPorcentual = roas_antes > 0
        ? ((roas_despues - roas_antes) / roas_antes) * 100
        : 0

      const resultadoValidacion = {
        mejoro,
        roas_antes,
        roas_despues,
        cambioPorcentual: Math.round(cambioPorcentual * 100) / 100,
        descripcion: mejoro
          ? `La acción fue efectiva. El ROAS mejoró de ${roas_antes.toFixed(1)}x a ${roas_despues.toFixed(1)}x.`
          : `La acción no tuvo el efecto esperado. El ROAS cambió de ${roas_antes.toFixed(1)}x a ${roas_despues.toFixed(1)}x.`,
      }

      // Guardar el resultado de la validación en la base de datos
      const { error: errorValidacion } = await supabaseAdmin
        .from('agent_actions')
        .update({
          validada_at: new Date().toISOString(),
          resultado_validacion: resultadoValidacion,
          estado: 'validada',
          updated_at: new Date().toISOString(),
        })
        .eq('id', accion.id)

      if (errorValidacion) {
        logger.warn({ errorValidacion, accionId: accion.id }, 'No se pudo guardar el resultado de la validación')
      }

      logger.info(
        { accionId: accion.id, mejoro, roas_antes, roas_despues, cambioPorcentual },
        'Validación de acción completada'
      )
    } catch (error) {
      // Error al validar una acción específica — continuar con las demás
      logger.error({ error, accionId: accion.id }, 'Error al validar resultado de acción')
    }
  }

  logger.info(
    { validadas: acciones.length, duracionMs: Date.now() - inicio },
    'Ciclo de validación completado'
  )
}
