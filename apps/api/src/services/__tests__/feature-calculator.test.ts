// ---------------------------------------------------------------------------
// Tests unitarios para feature-calculator.ts
// No requieren Supabase ni Base de Datos — solo prueban funciones puras
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll } from 'vitest'
import {
  calcularMedia,
  calcularDesviacionEstandar,
  calcularVolatilidad,
  calcularTendencia,
  calcularPercentil,
  filtrarPorVentana,
} from '../feature-calculator'

// ---------------------------------------------------------------------------
// calcularMedia
// ---------------------------------------------------------------------------

describe('calcularMedia', () => {
  it('retorna 0 cuando el array está vacío', () => {
    expect(calcularMedia([])).toBe(0)
  })

  it('retorna el valor exacto con un solo elemento', () => {
    expect(calcularMedia([5])).toBe(5)
  })

  it('calcula la media correctamente con valores enteros', () => {
    // Media de [1, 2, 3, 4, 5] = 15 / 5 = 3
    expect(calcularMedia([1, 2, 3, 4, 5])).toBe(3)
  })

  it('calcula la media correctamente con decimales', () => {
    expect(calcularMedia([1.5, 2.5, 3.0])).toBeCloseTo(2.333, 3)
  })

  it('maneja valores negativos', () => {
    // Media de [-3, -1, 0, 1, 3] = 0
    expect(calcularMedia([-3, -1, 0, 1, 3])).toBe(0)
  })

  it('maneja valores muy grandes sin desbordamiento', () => {
    expect(calcularMedia([1_000_000, 2_000_000, 3_000_000])).toBe(2_000_000)
  })
})

// ---------------------------------------------------------------------------
// calcularDesviacionEstandar
// ---------------------------------------------------------------------------

describe('calcularDesviacionEstandar', () => {
  it('retorna 0 cuando el array está vacío', () => {
    expect(calcularDesviacionEstandar([])).toBe(0)
  })

  it('retorna 0 con un solo elemento (varianza indefinida)', () => {
    expect(calcularDesviacionEstandar([42])).toBe(0)
  })

  it('retorna 0 cuando todos los valores son iguales', () => {
    expect(calcularDesviacionEstandar([5, 5, 5, 5])).toBe(0)
  })

  it('calcula la desviación estándar poblacional correctamente', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] → media = 5, varianza = 4, std = 2
    const valores = [2, 4, 4, 4, 5, 5, 7, 9]
    expect(calcularDesviacionEstandar(valores)).toBeCloseTo(2, 5)
  })

  it('retorna valor positivo para datos con dispersión', () => {
    expect(calcularDesviacionEstandar([1, 10, 100])).toBeGreaterThan(0)
  })

  it('es sensible a valores atípicos (outliers)', () => {
    const sinOutlier = calcularDesviacionEstandar([1, 2, 3, 4, 5])
    const conOutlier = calcularDesviacionEstandar([1, 2, 3, 4, 100])
    expect(conOutlier).toBeGreaterThan(sinOutlier)
  })
})

// ---------------------------------------------------------------------------
// calcularVolatilidad
// ---------------------------------------------------------------------------

describe('calcularVolatilidad', () => {
  it('retorna 0 cuando la media es 0 (división por cero)', () => {
    expect(calcularVolatilidad([0, 0, 0])).toBe(0)
  })

  it('retorna 0 cuando todos los valores son iguales (sin variación)', () => {
    expect(calcularVolatilidad([5, 5, 5])).toBe(0)
  })

  it('retorna el coeficiente de variación (std / media)', () => {
    // Media = 5, std = 2 → volatilidad = 2/5 = 0.4
    const valores = [2, 4, 4, 4, 5, 5, 7, 9]
    expect(calcularVolatilidad(valores)).toBeCloseTo(0.4, 5)
  })

  it('datos muy dispersos tienen mayor volatilidad que datos concentrados', () => {
    const concentrados = calcularVolatilidad([9, 10, 11])
    const dispersos    = calcularVolatilidad([1, 10, 100])
    expect(dispersos).toBeGreaterThan(concentrados)
  })
})

// ---------------------------------------------------------------------------
// calcularTendencia
// ---------------------------------------------------------------------------

describe('calcularTendencia', () => {
  it('retorna 0 cuando el período anterior es 0 (división por cero)', () => {
    expect(calcularTendencia(100, 0)).toBe(0)
  })

  it('retorna 0 cuando actual === anterior (sin cambio)', () => {
    expect(calcularTendencia(50, 50)).toBe(0)
  })

  it('retorna 100 cuando el valor se duplica', () => {
    expect(calcularTendencia(200, 100)).toBe(100)
  })

  it('retorna -50 cuando el valor cae a la mitad', () => {
    expect(calcularTendencia(50, 100)).toBe(-50)
  })

  it('calcula tendencia positiva correctamente', () => {
    // ((120 - 100) / 100) * 100 = 20%
    expect(calcularTendencia(120, 100)).toBeCloseTo(20, 5)
  })

  it('calcula tendencia negativa correctamente', () => {
    // ((75 - 100) / 100) * 100 = -25%
    expect(calcularTendencia(75, 100)).toBeCloseTo(-25, 5)
  })

  it('maneja decimales con precisión', () => {
    // ((1.5 - 1.2) / 1.2) * 100 = 25%
    expect(calcularTendencia(1.5, 1.2)).toBeCloseTo(25, 5)
  })
})

// ---------------------------------------------------------------------------
// calcularPercentil
// ---------------------------------------------------------------------------

describe('calcularPercentil', () => {
  it('retorna 0 cuando el conjunto está vacío', () => {
    expect(calcularPercentil(5, [])).toBe(0)
  })

  it('retorna 0 cuando el valor es menor que todos los del conjunto', () => {
    expect(calcularPercentil(0, [1, 2, 3, 4, 5])).toBe(0)
  })

  it('retorna 100 cuando el valor es mayor que todos los del conjunto', () => {
    expect(calcularPercentil(100, [1, 2, 3, 4, 5])).toBe(100)
  })

  it('retorna el percentil correcto para valor intermedio', () => {
    // Valores [1, 2, 3, 4, 5] — 3 menores que 4 → (3/5)*100 = 60
    expect(calcularPercentil(4, [1, 2, 3, 4, 5])).toBe(60)
  })

  it('retorna 50 para la mediana en conjunto simétrico', () => {
    // [1,2,3,4,5,6,7,8,9,10] — 5 menores que 6 → 50%
    expect(calcularPercentil(6, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(50)
  })

  it('usa valores estrictamente menores (no incluye igual al valor)', () => {
    // Solo cuenta los que son < valor, no <=
    expect(calcularPercentil(3, [1, 2, 3, 4, 5])).toBe(40)  // 2 menores que 3
  })
})

// ---------------------------------------------------------------------------
// filtrarPorVentana
// ---------------------------------------------------------------------------

describe('filtrarPorVentana', () => {
  // Generamos fechas relativas al día actual para que los tests no se rompan con el tiempo
  const hoy    = new Date()
  const ayer   = new Date(hoy); ayer.setDate(hoy.getDate() - 1)
  const hace3  = new Date(hoy); hace3.setDate(hoy.getDate() - 3)
  const hace7  = new Date(hoy); hace7.setDate(hoy.getDate() - 7)
  const hace10 = new Date(hoy); hace10.setDate(hoy.getDate() - 10)

  const toStr = (d: Date) => d.toISOString().split('T')[0]

  const datos = [
    { fecha: toStr(hoy),    valor: 1 },
    { fecha: toStr(ayer),   valor: 2 },
    { fecha: toStr(hace3),  valor: 3 },
    { fecha: toStr(hace7),  valor: 4 },
    { fecha: toStr(hace10), valor: 5 },
  ]

  it('retorna array vacío si no hay datos en la ventana', () => {
    expect(filtrarPorVentana([], 7)).toHaveLength(0)
  })

  it('retorna todos los datos dentro de la ventana de 7 días', () => {
    const resultado = filtrarPorVentana(datos, 7)
    // Deben estar: hoy, ayer, hace3, hace7 (7 días exactos cuenta)
    expect(resultado.length).toBeGreaterThanOrEqual(4)
  })

  it('excluye datos anteriores a la ventana', () => {
    const resultado = filtrarPorVentana(datos, 5)
    // hace10 no debe estar
    const valores = resultado.map(d => (d as any).valor)
    expect(valores).not.toContain(5)
  })

  it('incluye datos del día exactamente en el límite de la ventana', () => {
    const resultado = filtrarPorVentana(datos, 7)
    // hace7 está exactamente en el límite → debe incluirse
    const valores = resultado.map(d => (d as any).valor)
    expect(valores).toContain(4)
  })

  it('ventana de 1 día retorna solo datos recientes', () => {
    const resultado = filtrarPorVentana(datos, 1)
    // Solo hoy y ayer podrían estar, hace3 no
    const valores = resultado.map(d => (d as any).valor)
    expect(valores).not.toContain(3)
    expect(valores).not.toContain(4)
    expect(valores).not.toContain(5)
  })
})
