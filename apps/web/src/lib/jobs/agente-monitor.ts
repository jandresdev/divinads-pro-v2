import { supabaseAdmin } from '@/lib/api/autenticar'
import { ejecutarAgente, RespuestaAgente } from '@/lib/services/claude-cliente'
import { ejecutarHerramienta } from '@/lib/services/herramientas-agente'

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

    console.info(`[agente-monitor] Enviando anomalía al agente Claude para análisis: anomaliaId=${anomaliaId} campaign=${campaignId} tipo=${tipoAnomalia} severidad=${severidadScore}`)

    // Crear despachador vinculado al tenant para que las herramientas filtren por él
    const despachador = (nombre: string, input: Record<string, unknown>) =>
      ejecutarHerramienta(nombre, input, tenantId)

    // Ejecutar el agente con la capacidad de invocar herramientas
    const respuesta = await ejecutarAgente(mensajeAnalisis, despachador)

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
      console.warn(`[agente-monitor] No se pudo guardar el análisis en agent_actions: anomaliaId=${anomaliaId}`, errorInsert)
    }

    console.info(`[agente-monitor] Análisis del agente completado y registrado: anomaliaId=${anomaliaId} confianza=${respuesta.confianza} opcionRecomendada=${respuesta.recomendacion}`)

    return respuesta
  } catch (error) {
    console.error(`[agente-monitor] Error al analizar anomalía con el agente: anomaliaId=${anomaliaId}`, error)
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
 */
export async function jobAgenteMonitor(): Promise<void> {
  console.info('[agente-monitor] Iniciando ciclo del agente monitor')
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
    console.error('[agente-monitor] Error al obtener anomalías para el agente monitor', error)
    return
  }

  if (!anomalias?.length) {
    console.debug('[agente-monitor] No hay anomalías pendientes de análisis en este ciclo')
    return
  }

  console.info(`[agente-monitor] Procesando ${anomalias.length} anomalías con el agente`)

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
      console.warn(`[agente-monitor] No se pudo marcar la anomalía como analizada: anomaliaId=${anomalia.id}`, errorUpdate)
    }

    // Si el agente analizó correctamente, evaluar si la acción se puede auto-ejecutar
    if (respuesta) {
      const accionRecomendada = respuesta.opciones[respuesta.recomendacion]

      if (accionRecomendada && !accionRecomendada.requiereAprobacion) {
        // La acción tiene impacto menor a $100 — se puede ejecutar sin aprobación del usuario
        console.info(`[agente-monitor] Registrando acción para auto-ejecución (impacto < $100): anomaliaId=${anomalia.id} accion=${accionRecomendada.accion}`)

        // Registrar la intención de auto-ejecución en agent_actions
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
          console.warn(`[agente-monitor] No se pudo registrar la acción de auto-ejecución: anomaliaId=${anomalia.id}`, errorAutoEjecucion)
        }
      } else if (accionRecomendada?.requiereAprobacion) {
        // La acción supera el umbral — solo se puede ejecutar con aprobación del usuario
        console.info(`[agente-monitor] Acción requiere aprobación del usuario (impacto >= $100): anomaliaId=${anomalia.id} accion=${accionRecomendada.accion}`)
      }
    }
  }

  console.info(`[agente-monitor] Ciclo del agente monitor completado: procesadas=${anomalias.length} duracionMs=${Date.now() - inicio}`)
}
