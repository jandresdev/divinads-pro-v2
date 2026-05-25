// ---------------------------------------------------------------------------
// Job de feature engineering para DivinADS
// Calcula features estadísticos por campaña (ventanas 7 / 14 / 30 días)
// y los persiste en la tabla feature_snapshots cada 15 minutos
// ---------------------------------------------------------------------------

import { supabaseAdmin } from '../db/supabase'
import {
  calcularMedia,
  calcularVolatilidad,
  calcularTendencia,
  calcularPercentil,
  filtrarPorVentana,
} from '../services/feature-calculator'
import logger from '../utils/logger'
import { format } from 'date-fns'

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

// Fila de métricas diarias normalizada (centavos → unidades monetarias)
interface MetricaDiaria {
  fecha: string
  roas: number
  gasto: number        // en USD (ya normalizado desde centavos)
  ctr: number
  cpc: number          // en USD
  conversiones: number
  cpa: number          // en USD
  frecuencia: number
  alcance: number
}

// Benchmark de una campaña para calcular percentiles del tenant
interface BenchmarkCampaña {
  roas: number
  cpa: number
}

// ---------------------------------------------------------------------------
// Helpers de acceso a datos
// ---------------------------------------------------------------------------

/**
 * Obtener las métricas diarias de una campaña en los últimos 30 días.
 * Normaliza los valores monetarios de centavos a unidades (dividiendo entre 100).
 * Retorna array vacío si hay error o sin datos — el job omitirá la campaña.
 */
async function obtenerMetricasCampaña(
  tenantId: string,
  campaignId: string
): Promise<MetricaDiaria[]> {
  const hace30Dias = new Date()
  hace30Dias.setDate(hace30Dias.getDate() - 30)
  const fechaLimite = hace30Dias.toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('daily_metrics')
    .select(
      'fecha, roas, gasto_centavos, ctr, cpc_centavos, conversiones, cpa_centavos, frecuencia, alcance'
    )
    .eq('tenant_id', tenantId)
    .eq('campaign_id', campaignId)
    .gte('fecha', fechaLimite)
    .order('fecha', { ascending: true })

  if (error || !data) {
    logger.debug(
      { tenantId, campaignId, error: error?.message },
      'Error obteniendo métricas diarias — se omitirá esta campaña'
    )
    return []
  }

  // Convertir centavos a unidades monetarias para cálculos internos
  return data.map(m => ({
    fecha:        m.fecha,
    roas:         m.roas            ?? 0,
    gasto:       (m.gasto_centavos  ?? 0) / 100,
    ctr:          m.ctr             ?? 0,
    cpc:         (m.cpc_centavos    ?? 0) / 100,
    conversiones: m.conversiones    ?? 0,
    cpa:         (m.cpa_centavos    ?? 0) / 100,
    frecuencia:   m.frecuencia      ?? 0,
    alcance:      m.alcance         ?? 0,
  }))
}

// ---------------------------------------------------------------------------
// Cálculo de features por campaña
// ---------------------------------------------------------------------------

/**
 * Calcular el conjunto completo de features para una campaña.
 * Incluye promedios por ventana, tendencias, volatilidad, valores actuales
 * y percentiles relativos al tenant.
 *
 * Retorna objeto vacío si no hay datos suficientes — el job omitirá el upsert.
 */
async function calcularFeaturesCampaña(
  tenantId: string,
  campaignId: string,
  benchmarksTenant: BenchmarkCampaña[]
): Promise<Record<string, number>> {
  const metricas = await obtenerMetricasCampaña(tenantId, campaignId)

  // Sin datos históricos → no hay features que calcular
  if (!metricas.length) {
    logger.debug(
      { tenantId, campaignId },
      'Sin métricas históricas — omitiendo feature engineering para esta campaña'
    )
    return {}
  }

  // --- Separar métricas por ventana temporal ---

  // Ventana actual: últimos 7 días
  const metricas7d = filtrarPorVentana(metricas, 7)

  // Ventana media: últimos 14 días
  const metricas14d = filtrarPorVentana(metricas, 14)

  // Período anterior (semana previa: entre 14 y 7 días atrás)
  // Sirve como baseline para calcular tendencias comparativas
  const metricas7dAnterior = metricas.filter(m => {
    const fecha = new Date(m.fecha)
    const hace14Dias = new Date()
    hace14Dias.setDate(hace14Dias.getDate() - 14)
    const hace7Dias = new Date()
    hace7Dias.setDate(hace7Dias.getDate() - 7)
    return fecha >= hace14Dias && fecha < hace7Dias
  })

  // --- Promedios por ventana temporal ---

  const roasPromedio7d       = calcularMedia(metricas7d.map(m => m.roas))
  const roasPromedio14d      = calcularMedia(metricas14d.map(m => m.roas))
  const roasPromedio30d      = calcularMedia(metricas.map(m => m.roas))
  const roasPromedio7dAnt    = calcularMedia(metricas7dAnterior.map(m => m.roas))

  // Valores de tendencia — período actual vs semana anterior
  const gastoPromedio7d      = calcularMedia(metricas7d.map(m => m.gasto))
  const gastoPromedio7dAnt   = calcularMedia(metricas7dAnterior.map(m => m.gasto))
  const convPromedio7d       = calcularMedia(metricas7d.map(m => m.conversiones))
  const convPromedio7dAnt    = calcularMedia(metricas7dAnterior.map(m => m.conversiones))

  // Último día disponible → métricas "actuales"
  const ultimoDia = metricas[metricas.length - 1]
  const cpaActual = ultimoDia?.cpa ?? 0

  // --- Percentiles vs conjunto de campañas del tenant ---

  const roasPercentil = calcularPercentil(
    roasPromedio7d,
    benchmarksTenant.map(b => b.roas)
  )
  const cpaPercentil = calcularPercentil(
    cpaActual,
    benchmarksTenant.map(b => b.cpa)
  )

  // --- Construir objeto de features ---

  return {
    // Promedios por ventana temporal (ROAS)
    roas_promedio_7d:  roasPromedio7d,
    roas_promedio_14d: roasPromedio14d,
    roas_promedio_30d: roasPromedio30d,

    // Tendencias: delta porcentual entre semana actual y semana anterior
    roas_tendencia_7d:         calcularTendencia(roasPromedio7d, roasPromedio7dAnt),
    gasto_tendencia_7d:        calcularTendencia(gastoPromedio7d, gastoPromedio7dAnt),
    conversiones_tendencia_7d: calcularTendencia(convPromedio7d, convPromedio7dAnt),

    // Volatilidad: coeficiente de variación (desv.std / media) en los últimos 7 días
    roas_volatilidad_7d: calcularVolatilidad(metricas7d.map(m => m.roas)),
    cpc_volatilidad_7d:  calcularVolatilidad(metricas7d.map(m => m.cpc)),

    // Métricas del último día disponible (proxy de "hoy")
    roas_actual:              ultimoDia?.roas           ?? 0,
    gasto_actual_centavos:    Math.round((ultimoDia?.gasto ?? 0) * 100),
    ctr_actual:               ultimoDia?.ctr            ?? 0,
    cpc_actual_centavos:      Math.round((ultimoDia?.cpc  ?? 0) * 100),
    conversiones_actual:      ultimoDia?.conversiones   ?? 0,
    cpa_actual_centavos:      Math.round(cpaActual * 100),

    // Percentiles relativos al tenant (0 = peor, 100 = mejor del tenant)
    roas_percentil_tenant: roasPercentil,
    cpa_percentil_tenant:  cpaPercentil,

    // Indicadores de frecuencia y fatiga del anuncio
    frecuencia_promedio_7d: calcularMedia(metricas7d.map(m => m.frecuencia)),
    alcance_total_7d:       metricas7d.reduce((sum, m) => sum + m.alcance, 0),
  }
}

// ---------------------------------------------------------------------------
// Job principal
// ---------------------------------------------------------------------------

/**
 * Job principal: calcular y persistir features para todas las campañas activas.
 *
 * Flujo:
 *   1. Obtener todas las campañas activas de Supabase
 *   2. Agrupar por tenant para calcular benchmarks comparativos
 *   3. Para cada campaña, calcular features y hacer upsert en feature_snapshots
 *
 * Los errores por campaña individual son capturados y loggeados sin interrumpir
 * el proceso completo — resiliencia ante fallas parciales de datos.
 */
export async function jobCalcularFeatures(): Promise<void> {
  logger.info('Iniciando cálculo de features para todos los tenants')
  const inicio = Date.now()

  // Obtener todas las campañas activas del sistema
  const { data: campañas, error } = await supabaseAdmin
    .from('campaigns')
    .select('id, tenant_id, nombre')
    .eq('activa', true)

  if (error) {
    logger.error({ error: error.message }, 'Error obteniendo campañas activas — abortando job de features')
    return
  }

  if (!campañas?.length) {
    logger.info('No hay campañas activas — nada que calcular en feature engineering')
    return
  }

  // Agrupar campañas por tenant para procesar de forma conjunta
  const campañasPorTenant = campañas.reduce((acc, c) => {
    if (!acc[c.tenant_id]) acc[c.tenant_id] = []
    acc[c.tenant_id].push(c)
    return acc
  }, {} as Record<string, typeof campañas>)

  let featuresSincronizados = 0
  let campañasOmitidas = 0

  for (const [tenantId, campañasTenant] of Object.entries(campañasPorTenant)) {
    logger.debug(
      { tenantId, totalCampañas: campañasTenant.length },
      'Calculando benchmarks del tenant para percentiles'
    )

    // Obtener métricas de todas las campañas del tenant para calcular percentiles
    // Se procesan en paralelo para reducir latencia total
    const benchmarks = await Promise.all(
      campañasTenant.map(async c => {
        const metricas = await obtenerMetricasCampaña(tenantId, c.id)
        return {
          // ROAS promedio 7 días para benchmark de percentil
          roas: calcularMedia(filtrarPorVentana(metricas, 7).map(m => m.roas)),
          // CPA del último día para benchmark de percentil
          cpa: metricas.length ? (metricas[metricas.length - 1]?.cpa ?? 0) : 0,
        }
      })
    )

    // Calcular y persistir features campaña por campaña
    for (const campaña of campañasTenant) {
      const features = await calcularFeaturesCampaña(tenantId, campaña.id, benchmarks)

      // Sin features calculados → campaña sin datos suficientes, se omite
      if (!Object.keys(features).length) {
        campañasOmitidas++
        continue
      }

      // Upsert en feature_snapshots (una fila por tenant + campaign + fecha)
      const { error: upsertError } = await supabaseAdmin
        .from('feature_snapshots')
        .upsert(
          {
            tenant_id:   tenantId,
            campaign_id: campaña.id,
            fecha:       format(new Date(), 'yyyy-MM-dd'),
            features,                              // columna JSONB — objeto directo
            updated_at:  new Date().toISOString(),
          },
          { onConflict: 'tenant_id,campaign_id,fecha' }
        )

      if (upsertError) {
        logger.warn(
          { tenantId, campaignId: campaña.id, error: upsertError.message },
          'Error al guardar features — se continúa con la siguiente campaña'
        )
        campañasOmitidas++
      } else {
        featuresSincronizados++
      }
    }
  }

  logger.info(
    {
      featuresSincronizados,
      campañasOmitidas,
      duracionMs: Date.now() - inicio,
    },
    'Cálculo de features completado'
  )
}
