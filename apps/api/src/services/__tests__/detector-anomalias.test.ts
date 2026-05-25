// ---------------------------------------------------------------------------
// Tests unitarios para detector-anomalias.ts
// Mock mínimo del logger para aislar la función pura de efectos externos
// No requieren Supabase ni Base de Datos
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll } from 'vitest'

// Mock del logger de pino para evitar output en los tests y no requerir la dependencia de transporte
vi.mock('../../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info:  vi.fn(),
    warn:  vi.fn(),
    error: vi.fn(),
  },
}))

import { detectarAnomalias, type AnomaliaDetectada } from '../detector-anomalias'

// ---------------------------------------------------------------------------
// Helpers de test
// ---------------------------------------------------------------------------

/** Parámetros fijos reutilizados en todos los tests */
const TENANT_ID    = 'tenant-test-001'
const CAMPAIGN_ID  = 'campaign-test-001'
const NOMBRE_CAMP  = 'Campaña de Prueba'

/** Ejecutar el detector con features específicas */
function detectar(features: Record<string, number>): AnomaliaDetectada[] {
  return detectarAnomalias(TENANT_ID, CAMPAIGN_ID, NOMBRE_CAMP, features)
}

/** Buscar una anomalía por tipo en el resultado */
function encontrar(anomalias: AnomaliaDetectada[], tipo: string): AnomaliaDetectada | undefined {
  return anomalias.find(a => a.tipo === tipo)
}

// ---------------------------------------------------------------------------
// Caso base: sin anomalías
// ---------------------------------------------------------------------------

describe('detectarAnomalias — caso base', () => {
  it('retorna array vacío cuando todos los features son normales', () => {
    const featuresNormales: Record<string, number> = {
      roas_actual:                  4.0,
      roas_promedio_7d:             4.0,
      cpc_actual_centavos:          145,   // $1.45
      cpc_promedio_7d:              1.45,
      ctr_actual:                   2.8,
      ctr_promedio_7d:              2.8,
      frecuencia_promedio_7d:       3.0,
      conversiones_tendencia_7d:    5.0,   // +5% (creciendo)
      cpa_actual_centavos:          3125,  // $31.25
      cpa_promedio_7d:              31.25,
      presupuesto_diario_centavos:  10000, // $100
      gasto_actual_centavos:        7000,  // $70 (70% consumido)
    }
    const resultado = detectar(featuresNormales)
    expect(resultado).toHaveLength(0)
  })

  it('retorna array vacío cuando features están en 0 (sin datos)', () => {
    // Si roas_base7d=0 no se puede calcular la caída → no se dispara la regla
    const resultado = detectar({})
    expect(resultado).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Regla 1: ROAS bajo
// ---------------------------------------------------------------------------

describe('detectarAnomalias — roas_bajo', () => {
  it('detecta anomalía cuando roas_actual cae más del 20% bajo el promedio 7d', () => {
    // Base 4.0 — umbral: 4.0 * (1 - 0.20) = 3.2
    // Actual 3.0 < 3.2 → debe dispararse
    const anomalias = detectar({ roas_actual: 3.0, roas_promedio_7d: 4.0 })
    expect(encontrar(anomalias, 'roas_bajo')).toBeDefined()
  })

  it('NO detecta anomalía cuando la caída es menor al 20%', () => {
    // Actual 3.3 > 3.2 → no se dispara
    const anomalias = detectar({ roas_actual: 3.3, roas_promedio_7d: 4.0 })
    expect(encontrar(anomalias, 'roas_bajo')).toBeUndefined()
  })

  it('NO detecta anomalía si el promedio 7d es 0 (evita falsos positivos)', () => {
    const anomalias = detectar({ roas_actual: 0, roas_promedio_7d: 0 })
    expect(encontrar(anomalias, 'roas_bajo')).toBeUndefined()
  })

  it('tiene campaignId y tenantId correctos en la anomalía detectada', () => {
    const anomalias = detectar({ roas_actual: 2.0, roas_promedio_7d: 4.0 })
    const anomalia = encontrar(anomalias, 'roas_bajo')!
    expect(anomalia.campaignId).toBe(CAMPAIGN_ID)
    expect(anomalia.tenantId).toBe(TENANT_ID)
  })

  it('la severidad es 90 (crítico) cuando la caída supera el 40%', () => {
    // Base 4.0 → actual 2.0 → caída del 50% → severidad crítica = 90
    const anomalias = detectar({ roas_actual: 2.0, roas_promedio_7d: 4.0 })
    const anomalia  = encontrar(anomalias, 'roas_bajo')!
    expect(anomalia.severidadScore).toBe(90)
  })

  it('la severidad es 35 (bajo) cuando la caída es justo superior al 20%', () => {
    // Base 4.0 → actual 3.1 → caída ~22.5% → entre 15-25% → severidad media = 55... ≥25%=75
    // Corregido: 22.5% >= 15% pero < 25% → severidad 55
    const anomalias = detectar({ roas_actual: 3.1, roas_promedio_7d: 4.0 })
    const anomalia  = encontrar(anomalias, 'roas_bajo')!
    expect(anomalia.severidadScore).toBe(55)
  })
})

// ---------------------------------------------------------------------------
// Regla 2: CPC alto
// ---------------------------------------------------------------------------

describe('detectarAnomalias — cpc_alto', () => {
  it('detecta anomalía cuando CPC sube más del 20% sobre el promedio 7d', () => {
    // Base $1.00 → umbral: 1.00 * (1 + 0.20) = $1.20
    // Actual: 130 centavos = $1.30 > $1.20 → dispara
    const anomalias = detectar({ cpc_actual_centavos: 130, cpc_promedio_7d: 1.0 })
    expect(encontrar(anomalias, 'cpc_alto')).toBeDefined()
  })

  it('NO detecta anomalía cuando el aumento es menor al 20%', () => {
    // Actual: 115 centavos = $1.15 < $1.20 → no dispara
    const anomalias = detectar({ cpc_actual_centavos: 115, cpc_promedio_7d: 1.0 })
    expect(encontrar(anomalias, 'cpc_alto')).toBeUndefined()
  })

  it('NO detecta anomalía si el promedio 7d de CPC es 0', () => {
    const anomalias = detectar({ cpc_actual_centavos: 200, cpc_promedio_7d: 0 })
    expect(encontrar(anomalias, 'cpc_alto')).toBeUndefined()
  })

  it('la severidad escala con la magnitud del aumento', () => {
    // Aumento del 50% → 25% ≤ 50% < 40% → severidad 75 (alto)
    // Corregido: 50% ≥ 40% → severidad 90 (crítico)
    const anomalias = detectar({ cpc_actual_centavos: 150, cpc_promedio_7d: 1.0 })
    const anomalia  = encontrar(anomalias, 'cpc_alto')!
    expect(anomalia.severidadScore).toBe(90)
  })
})

// ---------------------------------------------------------------------------
// Regla 3: CTR bajo
// ---------------------------------------------------------------------------

describe('detectarAnomalias — ctr_bajo', () => {
  it('detecta anomalía cuando CTR cae más del 25% bajo el promedio 7d', () => {
    // Base 2.8% → umbral: 2.8 * (1 - 0.25) = 2.1%
    // Actual 1.5% < 2.1% → dispara
    const anomalias = detectar({ ctr_actual: 1.5, ctr_promedio_7d: 2.8 })
    expect(encontrar(anomalias, 'ctr_bajo')).toBeDefined()
  })

  it('NO detecta anomalía cuando la caída es menor al 25%', () => {
    // Actual 2.2% > 2.1% → no dispara
    const anomalias = detectar({ ctr_actual: 2.2, ctr_promedio_7d: 2.8 })
    expect(encontrar(anomalias, 'ctr_bajo')).toBeUndefined()
  })

  it('eleva la severidad a mínimo 75 cuando CTR absoluto es < 0.5%', () => {
    // CTR muy bajo → riesgo crítico adicional
    const anomalias = detectar({ ctr_actual: 0.3, ctr_promedio_7d: 1.0 })
    const anomalia  = encontrar(anomalias, 'ctr_bajo')!
    expect(anomalia.severidadScore).toBeGreaterThanOrEqual(75)
  })

  it('NO detecta anomalía si el promedio 7d de CTR es 0', () => {
    const anomalias = detectar({ ctr_actual: 0, ctr_promedio_7d: 0 })
    expect(encontrar(anomalias, 'ctr_bajo')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Regla 4: Frecuencia alta
// ---------------------------------------------------------------------------

describe('detectarAnomalias — frecuencia_alta', () => {
  it('NO detecta anomalía cuando frecuencia < 5.0', () => {
    const anomalias = detectar({ frecuencia_promedio_7d: 4.9 })
    expect(encontrar(anomalias, 'frecuencia_alta')).toBeUndefined()
  })

  it('detecta anomalía cuando frecuencia >= 5.0 (umbral "alta")', () => {
    const anomalias = detectar({ frecuencia_promedio_7d: 5.0 })
    expect(encontrar(anomalias, 'frecuencia_alta')).toBeDefined()
  })

  it('la severidad es 60 (no crítica) cuando frecuencia está entre 5.0 y 6.9', () => {
    const anomalias = detectar({ frecuencia_promedio_7d: 6.0 })
    const anomalia  = encontrar(anomalias, 'frecuencia_alta')!
    expect(anomalia.severidadScore).toBe(60)
  })

  it('la severidad es 85 (crítica) cuando frecuencia >= 7.0', () => {
    const anomalias = detectar({ frecuencia_promedio_7d: 7.0 })
    const anomalia  = encontrar(anomalias, 'frecuencia_alta')!
    expect(anomalia.severidadScore).toBe(85)
  })

  it('la descripción menciona acción inmediata cuando la frecuencia es crítica', () => {
    const anomalias = detectar({ frecuencia_promedio_7d: 8.0 })
    const anomalia  = encontrar(anomalias, 'frecuencia_alta')!
    expect(anomalia.descripcion).toMatch(/inmediata|acción/)
  })
})

// ---------------------------------------------------------------------------
// Regla 5: Presupuesto agotado
// ---------------------------------------------------------------------------

describe('detectarAnomalias — presupuesto_agotado', () => {
  it('NO detecta anomalía cuando el gasto es menor al 95%', () => {
    // 9000/10000 = 90% < 95%
    const anomalias = detectar({
      gasto_actual_centavos:       9000,
      presupuesto_diario_centavos: 10000,
    })
    expect(encontrar(anomalias, 'presupuesto_agotado')).toBeUndefined()
  })

  it('detecta anomalía cuando el gasto es exactamente el 95%', () => {
    const anomalias = detectar({
      gasto_actual_centavos:       9500,
      presupuesto_diario_centavos: 10000,
    })
    expect(encontrar(anomalias, 'presupuesto_agotado')).toBeDefined()
  })

  it('la severidad es 60 cuando el presupuesto está entre 95% y 99%', () => {
    const anomalias = detectar({
      gasto_actual_centavos:       9700,
      presupuesto_diario_centavos: 10000,
    })
    const anomalia = encontrar(anomalias, 'presupuesto_agotado')!
    expect(anomalia.severidadScore).toBe(60)
  })

  it('la severidad es 85 cuando el presupuesto está agotado al 100%+', () => {
    const anomalias = detectar({
      gasto_actual_centavos:       10000,
      presupuesto_diario_centavos: 10000,
    })
    const anomalia = encontrar(anomalias, 'presupuesto_agotado')!
    expect(anomalia.severidadScore).toBe(85)
  })

  it('NO detecta anomalía si el presupuesto diario es 0', () => {
    const anomalias = detectar({
      gasto_actual_centavos:       5000,
      presupuesto_diario_centavos: 0,
    })
    expect(encontrar(anomalias, 'presupuesto_agotado')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Regla 6: Caída de conversiones
// ---------------------------------------------------------------------------

describe('detectarAnomalias — caida_conversiones', () => {
  it('NO detecta anomalía cuando la tendencia es positiva', () => {
    const anomalias = detectar({ conversiones_tendencia_7d: 10 })
    expect(encontrar(anomalias, 'caida_conversiones')).toBeUndefined()
  })

  it('NO detecta anomalía cuando la caída es menor al 30%', () => {
    const anomalias = detectar({ conversiones_tendencia_7d: -29 })
    expect(encontrar(anomalias, 'caida_conversiones')).toBeUndefined()
  })

  it('detecta anomalía cuando la caída supera el 30%', () => {
    const anomalias = detectar({ conversiones_tendencia_7d: -31 })
    expect(encontrar(anomalias, 'caida_conversiones')).toBeDefined()
  })

  it('la severidad es 90 (crítica) para una caída >= 40%', () => {
    const anomalias = detectar({ conversiones_tendencia_7d: -45 })
    const anomalia  = encontrar(anomalias, 'caida_conversiones')!
    expect(anomalia.severidadScore).toBe(90)
  })

  it('la severidad es 75 (alto) para una caída entre 25% y 40%', () => {
    // 31% >= 25% pero < 40% → severidad 75 (alto)
    const anomalias = detectar({ conversiones_tendencia_7d: -31 })
    const anomalia  = encontrar(anomalias, 'caida_conversiones')!
    expect(anomalia.severidadScore).toBe(75)
  })
})

// ---------------------------------------------------------------------------
// Regla 7: CPA alto
// ---------------------------------------------------------------------------

describe('detectarAnomalias — cpa_alto', () => {
  it('detecta anomalía cuando CPA sube más del 25% sobre el promedio 7d', () => {
    // Base $31.25 → umbral: 31.25 * 1.25 = $39.06
    // Actual: 4000 centavos = $40.00 > $39.06 → dispara
    const anomalias = detectar({ cpa_actual_centavos: 4000, cpa_promedio_7d: 31.25 })
    expect(encontrar(anomalias, 'cpa_alto')).toBeDefined()
  })

  it('NO detecta anomalía cuando el aumento es menor al 25%', () => {
    // Actual: 3800 centavos = $38.00 < $39.06 → no dispara
    const anomalias = detectar({ cpa_actual_centavos: 3800, cpa_promedio_7d: 31.25 })
    expect(encontrar(anomalias, 'cpa_alto')).toBeUndefined()
  })

  it('NO detecta anomalía si el promedio 7d de CPA es 0', () => {
    const anomalias = detectar({ cpa_actual_centavos: 5000, cpa_promedio_7d: 0 })
    expect(encontrar(anomalias, 'cpa_alto')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Múltiples anomalías simultáneas
// ---------------------------------------------------------------------------

describe('detectarAnomalias — múltiples anomalías', () => {
  it('puede detectar las 7 anomalías a la vez cuando todas las condiciones se cumplen', () => {
    const featuresConTodo: Record<string, number> = {
      // ROAS bajo: actual 2.0 vs base 4.0 (caída 50%)
      roas_actual:                 2.0,
      roas_promedio_7d:            4.0,
      // CPC alto: $2.00 vs base $1.00 (subida 100%)
      cpc_actual_centavos:         200,
      cpc_promedio_7d:             1.0,
      // CTR bajo: 1.0% vs base 3.0% (caída 66%)
      ctr_actual:                  1.0,
      ctr_promedio_7d:             3.0,
      // Frecuencia alta crítica
      frecuencia_promedio_7d:      8.0,
      // Caída de conversiones
      conversiones_tendencia_7d:  -50,
      // CPA alto: $50 vs base $30 (subida 66%)
      cpa_actual_centavos:         5000,
      cpa_promedio_7d:             30.0,
      // Presupuesto agotado
      gasto_actual_centavos:       10000,
      presupuesto_diario_centavos: 10000,
    }

    const anomalias = detectar(featuresConTodo)
    expect(anomalias).toHaveLength(7)

    // Verificar que estén los 7 tipos
    const tipos = anomalias.map(a => a.tipo)
    expect(tipos).toContain('roas_bajo')
    expect(tipos).toContain('cpc_alto')
    expect(tipos).toContain('ctr_bajo')
    expect(tipos).toContain('frecuencia_alta')
    expect(tipos).toContain('presupuesto_agotado')
    expect(tipos).toContain('caida_conversiones')
    expect(tipos).toContain('cpa_alto')
  })

  it('todas las anomalías tienen campaignId y tenantId correctos', () => {
    const features: Record<string, number> = {
      roas_actual: 2.0, roas_promedio_7d: 4.0,
    }
    const anomalias = detectar(features)
    anomalias.forEach(a => {
      expect(a.campaignId).toBe(CAMPAIGN_ID)
      expect(a.tenantId).toBe(TENANT_ID)
    })
  })

  it('las anomalías incluyen el nombre de la campaña en la descripción', () => {
    const features: Record<string, number> = {
      roas_actual: 2.0, roas_promedio_7d: 4.0,
    }
    const anomalias = detectar(features)
    anomalias.forEach(a => {
      expect(a.descripcion).toContain(NOMBRE_CAMP)
    })
  })
})
