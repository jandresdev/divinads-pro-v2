import { supabaseAdmin } from '@/lib/api/autenticar'

// ---------------------------------------------------------------------------
// Implementación de herramientas para el agente DivinADS
// Cada función corresponde a una herramienta definida en HERRAMIENTAS_AGENTE
// ---------------------------------------------------------------------------

/**
 * Obtiene las métricas diarias de una campaña desde la tabla daily_metrics.
 * Retorna los datos como JSON string para que el agente pueda interpretarlos.
 *
 * @param campaignId - UUID de la campaña en Supabase
 * @param dias - Número de días hacia atrás a consultar (máximo 30)
 */
export async function obtenerMetricasCampaña(
  campaignId: string,
  dias: number = 7
): Promise<string> {
  // Calcular fecha límite de la consulta
  const fechaLimite = new Date()
  fechaLimite.setDate(fechaLimite.getDate() - dias)
  const fechaLimiteStr = fechaLimite.toISOString().split('T')[0]

  console.debug(`[herramientas-agente] Consultando métricas de campaña: campaignId=${campaignId} dias=${dias} fechaLimite=${fechaLimiteStr}`)

  const { data, error } = await supabaseAdmin
    .from('daily_metrics')
    .select(
      'fecha, roas, gasto_centavos, ctr, cpc_centavos, conversiones, cpa_centavos, frecuencia'
    )
    .eq('campaign_id', campaignId)
    .gte('fecha', fechaLimiteStr)
    .order('fecha', { ascending: true })

  if (error) {
    console.warn(`[herramientas-agente] Error al consultar daily_metrics: campaignId=${campaignId}`, error)
    return 'Error al consultar las métricas. La tabla puede no estar disponible.'
  }

  if (!data?.length) {
    return 'No se encontraron métricas para esta campaña en el período solicitado.'
  }

  // Convertir centavos a USD con 2 decimales para legibilidad del agente
  const resumen = data.map((m) => ({
    fecha: m.fecha,
    roas: m.roas?.toFixed(2) ?? '0,00',
    gasto_usd: ((m.gasto_centavos ?? 0) / 100).toFixed(2),
    ctr_pct: m.ctr?.toFixed(2) ?? '0,00',
    cpc_usd: ((m.cpc_centavos ?? 0) / 100).toFixed(2),
    conversiones: m.conversiones ?? 0,
    cpa_usd: ((m.cpa_centavos ?? 0) / 100).toFixed(2),
    frecuencia: m.frecuencia?.toFixed(2) ?? '0,00',
  }))

  return JSON.stringify({ metricas: resumen, diasConsultados: dias, totalRegistros: data.length })
}

/**
 * Obtiene el historial de anomalías previas de una campaña.
 * Permite al agente detectar si una anomalía es recurrente o nueva.
 *
 * @param campaignId - UUID de la campaña
 * @param limit - Número máximo de anomalías a recuperar
 */
export async function obtenerHistorialAnomalias(
  campaignId: string,
  limit: number = 10
): Promise<string> {
  console.debug(`[herramientas-agente] Consultando historial de anomalías: campaignId=${campaignId} limit=${limit}`)

  const { data, error } = await supabaseAdmin
    .from('anomalies')
    .select('tipo, severidad_score, titulo, descripcion, created_at, revisada')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn(`[herramientas-agente] Error al consultar historial de anomalías: campaignId=${campaignId}`, error)
    return 'Error al consultar el historial de anomalías.'
  }

  if (!data?.length) {
    return 'No se encontraron anomalías previas para esta campaña. Es la primera anomalía detectada.'
  }

  return JSON.stringify({ anomalias: data, totalAnomaliasHistorial: data.length })
}

/**
 * Obtiene la predicción de ROAS a 7 días generada por el modelo ML.
 * El agente usa esta información para estimar el impacto futuro de sus acciones.
 *
 * @param campaignId - UUID de la campaña
 */
export async function obtenerPrediccionROAS(campaignId: string): Promise<string> {
  console.debug(`[herramientas-agente] Consultando predicción de ROAS: campaignId=${campaignId}`)

  const { data, error } = await supabaseAdmin
    .from('predictions')
    .select('roas_predicho, confianza, tendencia, explicacion, fecha_prediccion')
    .eq('campaign_id', campaignId)
    .order('fecha_prediccion', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    console.debug(`[herramientas-agente] Sin predicción ML disponible: campaignId=${campaignId}`)
    return 'No hay predicción disponible para esta campaña. El modelo necesita más datos históricos (mínimo 14 días).'
  }

  return JSON.stringify({ prediccion: data })
}

/**
 * Obtiene la configuración del tenant, incluyendo tolerancia al riesgo,
 * límites de auto-ejecución y objetivos de ROAS.
 * Si no existe configuración, retorna valores por defecto seguros.
 *
 * @param tenantId - UUID del tenant
 */
export async function obtenerContextoTenant(tenantId: string): Promise<string> {
  console.debug(`[herramientas-agente] Consultando configuración del tenant: tenantId=${tenantId}`)

  // Configuración por defecto cuando el tenant no tiene ajustes personalizados
  const configDefault = {
    umbral_auto_ejecucion_centavos: 10000,   // $100 — acciones por encima requieren aprobación
    tolerancia_riesgo: 'media',              // 'baja' | 'media' | 'alta'
    objetivo_roas_minimo: 2.0,              // ROAS mínimo aceptable
    presupuesto_diario_maximo_centavos: 500000,  // $5.000 — tope de presupuesto diario
    moneda: 'USD',
    zona_horaria: 'America/Bogota',
  }

  const { data, error } = await supabaseAdmin
    .from('tenant_config')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) {
    console.debug(`[herramientas-agente] Sin configuración de tenant — usando valores por defecto: tenantId=${tenantId}`)
    return JSON.stringify({
      configuracion: configDefault,
      nota: 'Usando configuración por defecto. El tenant no tiene ajustes personalizados.',
    })
  }

  return JSON.stringify({ configuracion: data })
}

// ---------------------------------------------------------------------------
// Despachador central de herramientas
// ---------------------------------------------------------------------------

/**
 * Router central que recibe el nombre de una herramienta y sus parámetros
 * y delega la ejecución a la función correspondiente.
 * Es el punto de entrada que el agente Claude llama para cada tool_use.
 *
 * @param nombre - Nombre de la herramienta según la definición en HERRAMIENTAS_AGENTE
 * @param input - Parámetros de entrada validados por el SDK de Anthropic
 * @returns Resultado de la herramienta como JSON string
 */
export async function ejecutarHerramienta(
  nombre: string,
  input: Record<string, unknown>
): Promise<string> {
  console.debug(`[herramientas-agente] Despachando herramienta: ${nombre}`)

  switch (nombre) {
    case 'obtener_metricas_campaña':
      return obtenerMetricasCampaña(
        String(input.campaign_id),
        typeof input.dias === 'number' ? input.dias : 7
      )

    case 'obtener_historial_anomalias':
      return obtenerHistorialAnomalias(
        String(input.campaign_id),
        typeof input.limit === 'number' ? input.limit : 10
      )

    case 'obtener_prediccion_roas':
      return obtenerPrediccionROAS(String(input.campaign_id))

    case 'obtener_contexto_tenant':
      return obtenerContextoTenant(String(input.tenant_id))

    default:
      // El agente intentó usar una herramienta que no existe — informar sin lanzar error
      console.warn(`[herramientas-agente] Herramienta desconocida solicitada por el agente: ${nombre}`)
      return `Herramienta "${nombre}" no está disponible. Las herramientas válidas son: obtener_metricas_campaña, obtener_historial_anomalias, obtener_prediccion_roas, obtener_contexto_tenant.`
  }
}
