import { supabaseAdmin } from '../db/supabase'
import { ejecutarAgente, RespuestaAgente } from '../services/claude-cliente'
import { ejecutarHerramienta } from '../services/herramientas-agente'
import logger from '../utils/logger'

// ---------------------------------------------------------------------------
// Constantes de negocio del agente monitor
// ---------------------------------------------------------------------------

// Severidad mínima (0-100) para que una anomalía dispare el análisis del agente
const SEVERIDAD_MINIMA_ANALISIS = 70

// ---------------------------------------------------------------------------
// Análisis de anomalía con el agente Claude
// ---------------------------------------------------------------------------

/**
 * Analiza una anomalía específica utilizando el agente Claude con tool_use.
 * Guarda el resultado del análisis en la tabla agent_actions como registro.
 * Retorna null si ocurre cualquier error, para no interrumpir el ciclo del job.
 *
 * @param anomaliaId      - UUID de la anomalía en Supabase
 * @param tenantId        - UUID del tenant propietario
 * @param campaignId      - UUID de la campaña afectada
 * @param tipoAnomalia    - Código del tipo: 'roas_drop', 'ctr_drop', etc.
 * @param tituloAnomalia  - Título legible de la anomalía
 * @param severidadScore  - Puntuación de severidad 0-100
 */
async function analizarAnomalia(
  anomaliaId: string,
  tenantId: string,
  campaignId: string,
  tipoAnomalia: string,
  tituloAnomalia: string,
  severidadScore: number
): Promise<RespuestaAgente | null> {
  try {
    // Mensaje que describe la anomalía al agente para que la analice
    const mensajeAnalisis = `Analiza la siguiente anomalía detectada en una campaña de Meta Ads:

Tipo: ${tipoAnomalia}
Título: ${tituloAnomalia}
Severidad: ${severidadScore}/100
Campaña ID: ${campaignId}
Tenant ID: ${tenantId}

Usa las herramientas disponibles para recopilar contexto completo y proporciona un análisis detallado con recomendaciones de acción.`

    logger.info(
      { anomaliaId, campaignId, tipoAnomalia, severidadScore },
      'Enviando anomalía al agente Claude para análisis'
    )

    // Ejecutar el agente con la capacidad de invocar herramientas
    const respuesta = await ejecutarAgente(mensajeAnalisis, ejecutarHerramienta)

    // Guardar el análisis completo en agent_actions como registro de auditoría
    const { error: errorInsert } = await supabaseAdmin
      .from('agent_actions')
      .insert({
        tenant_id: tenantId,
        campaign_id: campaignId,
        anomaly_id: anomaliaId,
        tipo_accion: 'analisis',
        estado: 'completado',
        descripcion: respuesta.analisis,
        confianza: respuesta.confianza,
        opciones_generadas: respuesta.opciones,
        razonamiento: respuesta.razonamiento,
        recomendacion_indice: respuesta.recomendacion,
        // La acción recomendada requiere aprobación si el agente así lo indicó
        requiere_aprobacion: respuesta.opciones[respuesta.recomendacion]?.requiereAprobacion ?? true,
      })

    if (errorInsert) {
      logger.warn({ errorInsert, anomaliaId }, 'No se pudo guardar el análisis en agent_actions')
    }

    logger.info(
      { anomaliaId, confianza: respuesta.confianza, opcionRecomendada: respuesta.recomendacion },
      'Análisis del agente completado y registrado'
    )

    return respuesta
  } catch (error) {
    logger.error({ error, anomaliaId }, 'Error al analizar anomalía con el agente')
    return null
  }
}

// ---------------------------------------------------------------------------
// Job principal del agente monitor
// ---------------------------------------------------------------------------

/**
 * Job principal del agente monitor — ejecuta cada 15 minutos.
 * Detecta anomalías críticas no analizadas y dispara el análisis del agente Claude.
 * Procesa máximo 5 anomalías por ciclo para controlar el consumo de la API.
 * Si la acción recomendada no requiere aprobación, registra la intención de auto-ejecución.
 */
export async function jobAgenteMonitor(): Promise<void> {
  logger.info('Iniciando ciclo del agente monitor')
  const inicio = Date.now()

  // Obtener anomalías activas con severidad alta que aún no fueron analizadas por el agente
  const { data: anomalias, error } = await supabaseAdmin
    .from('anomalies')
    .select('id, tenant_id, campaign_id, tipo, titulo, severidad_score')
    .eq('activa', true)
    .gte('severidad_score', SEVERIDAD_MINIMA_ANALISIS)
    .is('analizada_at', null)         // Solo las que no fueron analizadas todavía
    .order('severidad_score', { ascending: false }) // Las más críticas primero
    .limit(5)                          // Máximo 5 por ciclo para controlar costos de API

  if (error) {
    logger.error({ error }, 'Error al obtener anomalías para el agente monitor')
    return
  }

  if (!anomalias?.length) {
    logger.debug('No hay anomalías pendientes de análisis en este ciclo')
    return
  }

  logger.info({ cantidad: anomalias.length }, `Procesando ${anomalias.length} anomalías con el agente`)

  for (const anomalia of anomalias) {
    // Analizar la anomalía con el agente Claude
    const respuesta = await analizarAnomalia(
      anomalia.id,
      anomalia.tenant_id,
      anomalia.campaign_id,
      anomalia.tipo,
      anomalia.titulo,
      anomalia.severidad_score
    )

    // Marcar la anomalía como analizada para no procesarla de nuevo
    const { error: errorUpdate } = await supabaseAdmin
      .from('anomalies')
      .update({
        analizada_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', anomalia.id)

    if (errorUpdate) {
      logger.warn({ errorUpdate, anomaliaId: anomalia.id }, 'No se pudo marcar la anomalía como analizada')
    }

    // Si el agente analizó correctamente, evaluar si la acción se puede auto-ejecutar
    if (respuesta) {
      const accionRecomendada = respuesta.opciones[respuesta.recomendacion]

      if (accionRecomendada && !accionRecomendada.requiereAprobacion) {
        // La acción tiene impacto menor a $100 — se puede ejecutar sin aprobación del usuario
        logger.info(
          { anomaliaId: anomalia.id, accion: accionRecomendada.accion },
          'Registrando acción para auto-ejecución (impacto < $100 — sin aprobación requerida)'
        )

        // Registrar la intención de auto-ejecución en agent_actions
        // La ejecución real se realiza en el servicio ejecutor-acciones (Paso 20)
        const { error: errorAutoEjecucion } = await supabaseAdmin
          .from('agent_actions')
          .insert({
            tenant_id: anomalia.tenant_id,
            campaign_id: anomalia.campaign_id,
            anomaly_id: anomalia.id,
            tipo_accion: accionRecomendada.tipoAccion,
            estado: 'pendiente_auto_ejecucion',
            descripcion: accionRecomendada.descripcion,
            confianza: respuesta.confianza,
            parametros_accion: accionRecomendada.parametros ?? {},
            requiere_aprobacion: false,
          })

        if (errorAutoEjecucion) {
          logger.warn(
            { errorAutoEjecucion, anomaliaId: anomalia.id },
            'No se pudo registrar la acción de auto-ejecución'
          )
        }
      } else if (accionRecomendada?.requiereAprobacion) {
        // La acción supera el umbral — solo se puede ejecutar con aprobación del usuario
        logger.info(
          { anomaliaId: anomalia.id, accion: accionRecomendada.accion },
          'Acción requiere aprobación del usuario (impacto >= $100)'
        )
      }
    }
  }

  logger.info(
    { procesadas: anomalias.length, duracionMs: Date.now() - inicio },
    'Ciclo del agente monitor completado'
  )
}
