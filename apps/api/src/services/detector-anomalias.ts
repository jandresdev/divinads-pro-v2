// ---------------------------------------------------------------------------
// Motor de detección de anomalías rule-based para DivinADS
// Funciones puras sin efectos secundarios — no hace llamadas async
// ---------------------------------------------------------------------------

import logger from '../utils/logger'

// ---------------------------------------------------------------------------
// Tipos exportados
// ---------------------------------------------------------------------------

export type TipoAnomalia =
  | 'roas_bajo'            // ROAS cayó vs promedio 7 días
  | 'cpc_alto'             // CPC subió vs promedio 7 días
  | 'ctr_bajo'             // CTR cayó vs promedio 7 días
  | 'frecuencia_alta'      // Frecuencia promedio supera umbral (riesgo de fatiga)
  | 'presupuesto_agotado'  // Gasto del día >= 95% del presupuesto diario
  | 'caida_conversiones'   // Conversiones cayeron >30% vs semana anterior
  | 'cpa_alto'             // CPA subió >25% vs baseline

export interface AnomaliaDetectada {
  tipo: TipoAnomalia
  severidadScore: number  // Escala 0-100 (35 bajo / 55 medio / 75 alto / 90 crítico)
  titulo: string
  descripcion: string
  campaignId: string
  tenantId: string
}

// ---------------------------------------------------------------------------
// Umbrales de detección configurables
// ---------------------------------------------------------------------------

const UMBRALES = {
  // ROAS: se dispara si el valor actual cayó más del 20% bajo el promedio 7d
  roas_caida_minima: 0.20,

  // CPC: se dispara si el valor actual subió más del 20% sobre el promedio 7d
  cpc_subida_minima: 0.20,

  // CTR: se dispara si el valor actual cayó más del 25% bajo el promedio 7d
  ctr_caida_minima: 0.25,

  // Frecuencia: riesgo de fatiga si la frecuencia promedio 7d supera estos valores
  frecuencia_alta:    5.0,  // Umbral "alto" — recomendar refrescar creatividades
  frecuencia_critica: 7.0,  // Umbral "crítico" — acción inmediata necesaria

  // Conversiones: tendencia porcentual de la semana (valor negativo en features)
  conversiones_caida_minima: 30,  // -30% tendencia = detectable

  // CPA: se dispara si el valor actual subió más del 25% sobre el promedio 7d
  cpa_subida_minima: 0.25,
} as const

// ---------------------------------------------------------------------------
// Funciones auxiliares puras
// ---------------------------------------------------------------------------

/**
 * Calcular el score de severidad (0-100) basado en la magnitud de la desviación.
 * Escala: Bajo (35) → Medio (55) → Alto (75) → Crítico (90).
 */
function calcularSeveridad(desviacionPorcentual: number): number {
  const magnitud = Math.abs(desviacionPorcentual)
  if (magnitud >= 40) return 90  // Crítico
  if (magnitud >= 25) return 75  // Alto
  if (magnitud >= 15) return 55  // Medio
  return 35                       // Bajo
}

/**
 * Formatear un cambio porcentual para mensajes en español.
 * Ejemplo: 23.7 → "+23,7%" | -15.4 → "-15,4%"
 */
function formatearCambio(valor: number): string {
  const signo = valor > 0 ? '+' : ''
  return `${signo}${valor.toFixed(1).replace('.', ',')}%`
}

/**
 * Formatear un valor decimal para mensajes en español.
 * Reemplaza el punto decimal por coma según convención LATAM.
 */
function formatearDecimal(valor: number, decimales = 2): string {
  return valor.toFixed(decimales).replace('.', ',')
}

// ---------------------------------------------------------------------------
// Función principal de detección (pura, sincrónica)
// ---------------------------------------------------------------------------

/**
 * Detectar todas las anomalías para un feature snapshot dado.
 *
 * Recibe el mapa de features calculado por el pipeline de feature engineering
 * y aplica cada regla de detección de forma independiente.
 *
 * Es una función pura: sin efectos secundarios, sin llamadas async.
 * La persistencia queda a cargo del job `detectar-anomalias.ts`.
 *
 * @param tenantId      - ID del tenant propietario de la campaña
 * @param campaignId    - ID de la campaña evaluada
 * @param nombreCampaña - Nombre legible de la campaña (para mensajes)
 * @param features      - Mapa de features calculados (JSONB de feature_snapshots)
 * @returns Array de anomalías detectadas (puede ser vacío si todo está normal)
 */
export function detectarAnomalias(
  tenantId: string,
  campaignId: string,
  nombreCampaña: string,
  features: Record<string, number>
): AnomaliaDetectada[] {
  const anomalias: AnomaliaDetectada[] = []

  // -------------------------------------------------------------------------
  // Regla 1: ROAS bajo
  // Condición: roas_actual < roas_promedio_7d * (1 - 0.20)
  // -------------------------------------------------------------------------
  const roasActual   = features['roas_actual']       ?? 0
  const roasBase7d   = features['roas_promedio_7d']  ?? 0

  if (roasBase7d > 0 && roasActual < roasBase7d * (1 - UMBRALES.roas_caida_minima)) {
    // Caída porcentual positiva (ej: 25 significa "cayó 25%")
    const caida = ((roasBase7d - roasActual) / roasBase7d) * 100

    anomalias.push({
      tipo:           'roas_bajo',
      severidadScore: calcularSeveridad(caida),
      titulo:         `ROAS cayó ${formatearCambio(-caida)} en las últimas 24h`,
      descripcion:    `El ROAS de "${nombreCampaña}" bajó de ${formatearDecimal(roasBase7d, 1)}x (promedio 7d) a ${formatearDecimal(roasActual, 1)}x. Posible fatiga de audiencia o aumento de competencia en la subasta.`,
      campaignId,
      tenantId,
    })

    logger.debug(
      { tenantId, campaignId, roasActual, roasBase7d, caida: caida.toFixed(1) },
      'Anomalía detectada: roas_bajo'
    )
  }

  // -------------------------------------------------------------------------
  // Regla 2: CPC alto
  // Condición: cpc_actual > cpc_promedio_7d * (1 + 0.20)
  // Los features almacenan CPC en centavos — normalizar a dólares para mensajes
  // -------------------------------------------------------------------------
  const cpcActualCentavos = features['cpc_actual_centavos'] ?? 0
  const cpcBase7dRaw      = features['cpc_promedio_7d']     ?? 0  // En dólares si está disponible

  // Convertir actual a dólares para comparar con baseline
  const cpcActual = cpcActualCentavos / 100
  const cpcBase7d = cpcBase7dRaw

  if (cpcBase7d > 0 && cpcActual > cpcBase7d * (1 + UMBRALES.cpc_subida_minima)) {
    const subida = ((cpcActual - cpcBase7d) / cpcBase7d) * 100

    anomalias.push({
      tipo:           'cpc_alto',
      severidadScore: calcularSeveridad(subida),
      titulo:         `CPC aumentó ${formatearCambio(subida)} vs promedio de 7 días`,
      descripcion:    `El costo por click de "${nombreCampaña}" subió de $${formatearDecimal(cpcBase7d)} a $${formatearDecimal(cpcActual)}. Alta competencia en la subasta — considerar revisar puja.`,
      campaignId,
      tenantId,
    })

    logger.debug(
      { tenantId, campaignId, cpcActual, cpcBase7d, subida: subida.toFixed(1) },
      'Anomalía detectada: cpc_alto'
    )
  }

  // -------------------------------------------------------------------------
  // Regla 3: CTR bajo
  // Condición: ctr_actual < ctr_promedio_7d * (1 - 0.25)
  // CTR se almacena como porcentaje (ej: 2.5 = 2,5%)
  // -------------------------------------------------------------------------
  const ctrActual = features['ctr_actual']      ?? 0
  const ctrBase7d = features['ctr_promedio_7d'] ?? 0

  if (ctrBase7d > 0 && ctrActual < ctrBase7d * (1 - UMBRALES.ctr_caida_minima)) {
    const caida = ((ctrBase7d - ctrActual) / ctrBase7d) * 100

    // Severidad adicional basada en CTR absoluto: CTR < 0.5% es señal grave
    const severidadBase = calcularSeveridad(caida)
    const severidad = ctrActual < 0.5 ? Math.max(severidadBase, 75) : severidadBase

    anomalias.push({
      tipo:           'ctr_bajo',
      severidadScore: severidad,
      titulo:         `CTR cayó ${formatearCambio(-caida)} — creatividades con bajo engagement`,
      descripcion:    `El CTR de "${nombreCampaña}" bajó de ${formatearDecimal(ctrBase7d, 2)}% a ${formatearDecimal(ctrActual, 2)}%. Las creatividades pueden estar perdiendo relevancia para la audiencia.`,
      campaignId,
      tenantId,
    })

    logger.debug(
      { tenantId, campaignId, ctrActual, ctrBase7d, caida: caida.toFixed(1) },
      'Anomalía detectada: ctr_bajo'
    )
  }

  // -------------------------------------------------------------------------
  // Regla 4: Frecuencia alta (riesgo de fatiga de audiencia)
  // Condición: frecuencia_promedio_7d > 5.0 (alta) o > 7.0 (crítica)
  // -------------------------------------------------------------------------
  const frecuencia7d = features['frecuencia_promedio_7d'] ?? 0

  if (frecuencia7d >= UMBRALES.frecuencia_alta) {
    const esCritica = frecuencia7d >= UMBRALES.frecuencia_critica

    anomalias.push({
      tipo:           'frecuencia_alta',
      severidadScore: esCritica ? 85 : 60,
      titulo:         `Frecuencia alta detectada: ${formatearDecimal(frecuencia7d, 1)}x promedio 7 días`,
      descripcion:    `La audiencia de "${nombreCampaña}" ha visto los anuncios ${formatearDecimal(frecuencia7d, 1)} veces en promedio en los últimos 7 días. ${esCritica ? 'Riesgo crítico de fatiga — se recomienda acción inmediata: refrescar creatividades o ampliar audiencia.' : 'Considera actualizar las creatividades para mantener el engagement.'}`,
      campaignId,
      tenantId,
    })

    logger.debug(
      { tenantId, campaignId, frecuencia7d, esCritica },
      'Anomalía detectada: frecuencia_alta'
    )
  }

  // -------------------------------------------------------------------------
  // Regla 5: Caída de conversiones
  // Condición: conversiones_tendencia_7d < -30 (tendencia negativa > 30%)
  // El feature `conversiones_tendencia_7d` es un delta% calculado por el pipeline
  // -------------------------------------------------------------------------
  const tendenciaConversiones = features['conversiones_tendencia_7d'] ?? 0

  if (tendenciaConversiones < -UMBRALES.conversiones_caida_minima) {
    // La tendencia ya es negativa — usar valor absoluto para calcular severidad
    const magnitudCaida = Math.abs(tendenciaConversiones)

    anomalias.push({
      tipo:           'caida_conversiones',
      severidadScore: calcularSeveridad(magnitudCaida),
      titulo:         `Conversiones cayeron ${formatearCambio(tendenciaConversiones)} esta semana`,
      descripcion:    `Las conversiones de "${nombreCampaña}" bajaron significativamente comparado con la semana anterior. Revisar calidad del tráfico, cambios en la página de destino y configuración de eventos de conversión.`,
      campaignId,
      tenantId,
    })

    logger.debug(
      { tenantId, campaignId, tendenciaConversiones },
      'Anomalía detectada: caida_conversiones'
    )
  }

  // -------------------------------------------------------------------------
  // Regla 6: CPA alto
  // Condición: cpa_actual > cpa_promedio_7d * (1 + 0.25)
  // Los features almacenan CPA en centavos — normalizar a dólares para mensajes
  // -------------------------------------------------------------------------
  const cpaActualCentavos = features['cpa_actual_centavos'] ?? 0
  const cpaBase7dRaw      = features['cpa_promedio_7d']     ?? 0  // En dólares si está disponible

  const cpaActual = cpaActualCentavos / 100
  const cpaBase7d = cpaBase7dRaw

  if (cpaBase7d > 0 && cpaActual > cpaBase7d * (1 + UMBRALES.cpa_subida_minima)) {
    const subida = ((cpaActual - cpaBase7d) / cpaBase7d) * 100

    anomalias.push({
      tipo:           'cpa_alto',
      severidadScore: calcularSeveridad(subida),
      titulo:         `CPA aumentó ${formatearCambio(subida)} vs baseline`,
      descripcion:    `El costo por adquisición de "${nombreCampaña}" subió de $${formatearDecimal(cpaBase7d)} a $${formatearDecimal(cpaActual)}. Revisar la segmentación, puja y calidad de la landing page.`,
      campaignId,
      tenantId,
    })

    logger.debug(
      { tenantId, campaignId, cpaActual, cpaBase7d, subida: subida.toFixed(1) },
      'Anomalía detectada: cpa_alto'
    )
  }

  // -------------------------------------------------------------------------
  // Regla 7: Presupuesto agotado
  // Condición: gasto_actual >= 95% del presupuesto diario
  // Requiere feature `porcentaje_presupuesto_consumido` calculado externamente
  // o bien `gasto_actual_centavos` + `presupuesto_diario_centavos`
  // -------------------------------------------------------------------------
  const presupuestoDiarioCentavos = features['presupuesto_diario_centavos'] ?? 0
  const gastoActualCentavos       = features['gasto_actual_centavos']       ?? 0

  if (presupuestoDiarioCentavos > 0) {
    const porcentajeConsumido = (gastoActualCentavos / presupuestoDiarioCentavos) * 100

    if (porcentajeConsumido >= 95) {
      // Severidad escala: 95-99% = 60, 100%+ = 85
      const severidad = porcentajeConsumido >= 100 ? 85 : 60

      anomalias.push({
        tipo:           'presupuesto_agotado',
        severidadScore: severidad,
        titulo:         `Presupuesto ${porcentajeConsumido >= 100 ? 'agotado' : 'casi agotado'}: ${formatearDecimal(porcentajeConsumido, 0)}% consumido`,
        descripcion:    `"${nombreCampaña}" ha consumido el ${formatearDecimal(porcentajeConsumido, 0)}% del presupuesto diario ($${formatearDecimal(gastoActualCentavos / 100)} de $${formatearDecimal(presupuestoDiarioCentavos / 100)}). ${porcentajeConsumido >= 100 ? 'Los anuncios dejaron de entregarse.' : 'Los anuncios podrían dejar de entregarse pronto.'}`,
        campaignId,
        tenantId,
      })

      logger.debug(
        { tenantId, campaignId, porcentajeConsumido: porcentajeConsumido.toFixed(1) },
        'Anomalía detectada: presupuesto_agotado'
      )
    }
  }

  return anomalias
}
