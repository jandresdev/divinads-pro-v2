// ---------------------------------------------------------------------------
// Módulo de predicción ML de DivinADS
// Implementa regresión lineal desde cero en TypeScript puro (sin librerías externas)
// ---------------------------------------------------------------------------

import { calcularMedia } from './feature-calculator'

// ---------------------------------------------------------------------------
// Tipos de salida
// ---------------------------------------------------------------------------

/** Resultado completo de una predicción de ROAS para una campaña */
export interface ResultadoPrediccion {
  /** ROAS estimado para los próximos 7 días */
  roasPredicho: number
  /** Nivel de confianza de la predicción: 0-100 */
  confianza: number
  /** Dirección de la tendencia detectada en el historial */
  tendencia: 'mejorando' | 'estable' | 'deteriorando'
  /** Explicación en lenguaje natural (español) para mostrar al usuario */
  explicacion: string
}

/** Parámetros de una regresión lineal simple */
interface ParametrosRegresion {
  /** Pendiente de la recta (slope) — indica velocidad de cambio */
  pendiente: number
  /** Intercepto (valor cuando x=0) */
  intercepto: number
  /** Coeficiente de determinación R² — qué tan bien ajusta el modelo (0-1) */
  r2: number
}

// ---------------------------------------------------------------------------
// Regresión lineal simple (una variable independiente)
// ---------------------------------------------------------------------------

/**
 * Calcular una regresión lineal simple entre dos series de datos.
 * Usa el método de mínimos cuadrados ordinarios (OLS).
 *
 * @param x - Variable independiente (ej: índices de tiempo)
 * @param y - Variable dependiente (ej: valores de ROAS)
 * @returns Pendiente, intercepto y R² del ajuste
 */
export function regresionLineal(x: number[], y: number[]): ParametrosRegresion {
  const n = x.length

  // Con menos de 2 puntos no se puede ajustar una recta
  if (n < 2) return { pendiente: 0, intercepto: 0, r2: 0 }

  const mediaX = calcularMedia(x)
  const mediaY = calcularMedia(y)

  // Calcular numerador y denominador de la pendiente usando covarianza y varianza
  let numerador   = 0
  let denominador = 0
  for (let i = 0; i < n; i++) {
    numerador   += (x[i] - mediaX) * (y[i] - mediaY)
    denominador += Math.pow(x[i] - mediaX, 2)
  }

  // Evitar división por cero cuando todos los valores de x son iguales
  const pendiente  = denominador === 0 ? 0 : numerador / denominador
  const intercepto = mediaY - pendiente * mediaX

  // Calcular R² — suma de cuadrados total vs residual
  const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - mediaY, 2), 0)
  const ssRes = y.reduce((sum, yi, i) => {
    const predicho = pendiente * x[i] + intercepto
    return sum + Math.pow(yi - predicho, 2)
  }, 0)

  // Clamp a [0, 1]: R² puede ser negativo con modelos muy malos, lo forzamos a 0
  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot)

  return { pendiente, intercepto, r2 }
}

// ---------------------------------------------------------------------------
// Predictor principal de ROAS
// ---------------------------------------------------------------------------

/**
 * Predecir el ROAS esperado para los próximos 7 días usando regresión lineal
 * sobre el historial de ROAS y ajustes por features adicionales de la campaña.
 *
 * @param historicoRoas - Serie temporal de ROAS diario, del más antiguo al más reciente
 * @param features      - Features calculados por el pipeline de feature engineering
 * @returns Predicción con ROAS estimado, confianza, tendencia y explicación
 */
export function predecirROAS(
  historicoRoas: number[],
  features: Record<string, number>,
): ResultadoPrediccion {
  // Predicción conservadora cuando no hay suficientes datos históricos
  if (historicoRoas.length < 5) {
    const roasActual = features['roas_actual'] ?? features['roas_promedio_7d'] ?? 0
    return {
      roasPredicho: roasActual,
      confianza:    20,
      tendencia:    'estable',
      explicacion:
        'Datos insuficientes para una predicción confiable. Se necesitan al menos 5 días de historial.',
    }
  }

  // Crear índices de tiempo como variable independiente (0, 1, 2, ..., n-1)
  const tiempos  = Array.from({ length: historicoRoas.length }, (_, i) => i)
  const regresion = regresionLineal(tiempos, historicoRoas)

  // Extrapolar la recta de regresión 7 días hacia el futuro
  const siguientePunto = historicoRoas.length + 7
  let roasPredicho     = regresion.pendiente * siguientePunto + regresion.intercepto

  // Ajuste negativo por alta frecuencia de exposición
  // La saturación del usuario baja el ROAS cuando ve el mismo anuncio muchas veces
  const frecuencia = features['frecuencia_promedio_7d'] ?? 0
  if (frecuencia > 6) {
    // Alta saturación — caída significativa esperada
    roasPredicho *= 0.85
  } else if (frecuencia > 4) {
    // Saturación moderada — caída leve
    roasPredicho *= 0.95
  }

  // Limitar el ROAS predicho a un rango razonable para publicidad digital
  roasPredicho = Math.max(0.1, Math.min(20, roasPredicho))

  // Calcular confianza combinando R² del modelo y cantidad de datos históricos
  const confianzaR2  = Math.round(regresion.r2 * 100)
  const bonusDatos   = Math.min(20, historicoRoas.length - 5) * 2 // +2% por cada día extra sobre el mínimo
  const confianza    = Math.min(95, confianzaR2 + bonusDatos)

  // Determinar tendencia comparando la pendiente relativa a la media de ROAS
  const mediaRoas            = calcularMedia(historicoRoas)
  const tendenciaPorcentual  = mediaRoas === 0 ? 0 : (regresion.pendiente / mediaRoas) * 100
  let tendencia: ResultadoPrediccion['tendencia']
  let descripcionTendencia: string

  if (tendenciaPorcentual > 2) {
    tendencia             = 'mejorando'
    descripcionTendencia  = 'en tendencia positiva'
  } else if (tendenciaPorcentual < -2) {
    tendencia             = 'deteriorando'
    descripcionTendencia  = 'en tendencia negativa'
  } else {
    tendencia             = 'estable'
    descripcionTendencia  = 'estable'
  }

  // Formatear el ROAS predicho con coma decimal para el texto en español
  const roasFormateado = roasPredicho.toFixed(1).replace('.', ',')
  const explicacion    =
    `Basado en ${historicoRoas.length} días de historial, el ROAS estará en ${roasFormateado}x ` +
    `en los próximos 7 días. La campaña está ${descripcionTendencia}.`

  return { roasPredicho, confianza, tendencia, explicacion }
}

// ---------------------------------------------------------------------------
// Detector de tendencias (regresión lineal sobre una serie temporal)
// ---------------------------------------------------------------------------

/**
 * Analizar la tendencia de una serie temporal usando la pendiente de la regresión.
 * Útil para detectar si el ROAS está mejorando o empeorando en los últimos N días.
 *
 * @param serie - Valores ordenados cronológicamente (más antiguo → más reciente)
 * @returns Pendiente normalizada como porcentaje diario de cambio
 */
export function detectarTendenciaSerie(serie: number[]): number {
  if (serie.length < 2) return 0

  // Usar índices de tiempo como variable independiente
  const tiempos   = Array.from({ length: serie.length }, (_, i) => i)
  const regresion = regresionLineal(tiempos, serie)
  const media     = calcularMedia(serie)

  // Retornar la pendiente normalizada (cambio porcentual por día)
  return media === 0 ? 0 : (regresion.pendiente / media) * 100
}
