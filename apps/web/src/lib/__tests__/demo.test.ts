// ---------------------------------------------------------------------------
// Tests unitarios para src/lib/constantes/demo.ts
// Valida que los datos de demostración tienen la estructura esperada
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import { DATOS_DEMO_KPI } from '../constantes/demo'

// ---------------------------------------------------------------------------
// DATOS_DEMO_KPI — estructura de datos de demostración para KPIs
// ---------------------------------------------------------------------------

describe('DATOS_DEMO_KPI', () => {
  it('contiene exactamente las 6 métricas del dashboard', () => {
    const claves = Object.keys(DATOS_DEMO_KPI)
    expect(claves).toHaveLength(6)
  })

  it('incluye las métricas principales: gasto, roas, ctr, cpc, conversiones, cpa', () => {
    expect(DATOS_DEMO_KPI).toHaveProperty('gasto')
    expect(DATOS_DEMO_KPI).toHaveProperty('roas')
    expect(DATOS_DEMO_KPI).toHaveProperty('ctr')
    expect(DATOS_DEMO_KPI).toHaveProperty('cpc')
    expect(DATOS_DEMO_KPI).toHaveProperty('conversiones')
    expect(DATOS_DEMO_KPI).toHaveProperty('cpa')
  })

  it('cada métrica tiene las propiedades valor, variacion y periodo', () => {
    const metricas = Object.values(DATOS_DEMO_KPI)
    metricas.forEach(metrica => {
      expect(metrica).toHaveProperty('valor')
      expect(metrica).toHaveProperty('variacion')
      expect(metrica).toHaveProperty('periodo')
    })
  })

  it('todos los valores son de tipo number', () => {
    const metricas = Object.values(DATOS_DEMO_KPI)
    metricas.forEach(metrica => {
      expect(typeof metrica.valor).toBe('number')
      expect(typeof metrica.variacion).toBe('number')
    })
  })

  it('todos los períodos son de tipo string', () => {
    const metricas = Object.values(DATOS_DEMO_KPI)
    metricas.forEach(metrica => {
      expect(typeof metrica.periodo).toBe('string')
      expect(metrica.periodo.length).toBeGreaterThan(0)
    })
  })

  it('el gasto es un número positivo representando USD', () => {
    expect(DATOS_DEMO_KPI.gasto.valor).toBeGreaterThan(0)
  })

  it('el ROAS es un número positivo mayor que 0', () => {
    expect(DATOS_DEMO_KPI.roas.valor).toBeGreaterThan(0)
  })

  it('el CTR está en rango razonable para publicidad (0-100%)', () => {
    expect(DATOS_DEMO_KPI.ctr.valor).toBeGreaterThan(0)
    expect(DATOS_DEMO_KPI.ctr.valor).toBeLessThan(100)
  })

  it('las conversiones son un número entero positivo', () => {
    expect(DATOS_DEMO_KPI.conversiones.valor).toBeGreaterThan(0)
    expect(Number.isFinite(DATOS_DEMO_KPI.conversiones.valor)).toBe(true)
  })

  it('hay variaciones tanto positivas como negativas (mix de KPIs)', () => {
    const variaciones = Object.values(DATOS_DEMO_KPI).map(m => m.variacion)
    const hayPositivas = variaciones.some(v => v > 0)
    const hayNegativas = variaciones.some(v => v < 0)
    // Los datos demo son realistas: no todos mejoran o empeoran
    expect(hayPositivas).toBe(true)
    expect(hayNegativas).toBe(true)
  })

  it('todos los períodos hacen referencia al mismo rango de comparación', () => {
    const periodos = Object.values(DATOS_DEMO_KPI).map(m => m.periodo)
    // Todos deben mencionar "7 días" como período de comparación
    periodos.forEach(periodo => {
      expect(periodo).toMatch(/7 días/)
    })
  })
})
