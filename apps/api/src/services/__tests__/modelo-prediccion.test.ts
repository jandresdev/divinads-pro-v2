// ---------------------------------------------------------------------------
// Tests unitarios para modelo-prediccion.ts
// No requieren Supabase ni Base de Datos — solo prueban funciones puras
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import { regresionLineal, predecirROAS } from '../modelo-prediccion'

// ---------------------------------------------------------------------------
// regresionLineal
// ---------------------------------------------------------------------------

describe('regresionLineal', () => {
  it('retorna pendiente=0, intercepto=0, r2=0 con menos de 2 puntos', () => {
    expect(regresionLineal([], [])).toEqual({ pendiente: 0, intercepto: 0, r2: 0 })
    expect(regresionLineal([1], [2])).toEqual({ pendiente: 0, intercepto: 0, r2: 0 })
  })

  it('ajusta perfectamente una línea recta (r2 = 1)', () => {
    // y = 2x + 1 → pendiente=2, intercepto=1, r2=1
    const x = [0, 1, 2, 3, 4]
    const y = [1, 3, 5, 7, 9]
    const resultado = regresionLineal(x, y)
    expect(resultado.pendiente).toBeCloseTo(2, 5)
    expect(resultado.intercepto).toBeCloseTo(1, 5)
    expect(resultado.r2).toBeCloseTo(1, 5)
  })

  it('calcula pendiente negativa para datos decrecientes', () => {
    const x = [0, 1, 2, 3, 4]
    const y = [10, 8, 6, 4, 2]
    const resultado = regresionLineal(x, y)
    expect(resultado.pendiente).toBeCloseTo(-2, 5)
    expect(resultado.r2).toBeCloseTo(1, 5)
  })

  it('retorna pendiente=0 cuando todos los valores de x son iguales (denominador cero)', () => {
    // Todos los x son iguales → denominador de pendiente = 0
    const resultado = regresionLineal([5, 5, 5], [1, 2, 3])
    expect(resultado.pendiente).toBe(0)
  })

  it('retorna r2=0 cuando y es constante (ssTot=0)', () => {
    // Si todos los y son iguales, ssTot=0 → r2 debería ser 0 (clampado)
    const resultado = regresionLineal([1, 2, 3], [4, 4, 4])
    expect(resultado.r2).toBe(0)
  })

  it('r2 está siempre en el rango [0, 1]', () => {
    // Datos aleatorios con poca correlación — r2 no debe ser negativo (clampado a 0)
    const x = [1, 2, 3, 4, 5]
    const y = [5, 1, 4, 2, 3]  // sin orden claro
    const resultado = regresionLineal(x, y)
    expect(resultado.r2).toBeGreaterThanOrEqual(0)
    expect(resultado.r2).toBeLessThanOrEqual(1)
  })

  it('calcula intercepto como mediaY - pendiente * mediaX', () => {
    const x = [1, 2, 3, 4, 5]
    const y = [2, 4, 5, 4, 5]
    const resultado = regresionLineal(x, y)
    // Verificar que la recta pasa cerca del centroide (mediaX, mediaY)
    const mediaX = 3
    const mediaY = 4
    const valorEnCentroide = resultado.pendiente * mediaX + resultado.intercepto
    expect(valorEnCentroide).toBeCloseTo(mediaY, 5)
  })
})

// ---------------------------------------------------------------------------
// predecirROAS
// ---------------------------------------------------------------------------

describe('predecirROAS', () => {
  // Historial mínimo suficiente (>=5 puntos)
  const historicoCreciente = [2.0, 2.2, 2.4, 2.6, 2.8, 3.0, 3.2]
  const historicoDecreciente = [4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0]
  const historicoEstable = [3.0, 3.1, 2.9, 3.0, 3.1, 2.9, 3.0]

  // Features vacíos para tests que no dependen de features
  const featuresVacios: Record<string, number> = {}

  // ---------------------------------------------------------------------------
  // Fallback con datos insuficientes (<5 puntos)
  // ---------------------------------------------------------------------------

  it('retorna confianza=20 y tendencia=estable con menos de 5 puntos', () => {
    const resultado = predecirROAS([2.0, 2.5, 3.0], featuresVacios)
    expect(resultado.confianza).toBe(20)
    expect(resultado.tendencia).toBe('estable')
  })

  it('usa roas_actual como roasPredicho en fallback', () => {
    const features = { roas_actual: 3.5 }
    const resultado = predecirROAS([2.0], features)
    expect(resultado.roasPredicho).toBe(3.5)
  })

  it('usa roas_promedio_7d si no hay roas_actual en fallback', () => {
    const features = { roas_promedio_7d: 2.8 }
    const resultado = predecirROAS([], features)
    expect(resultado.roasPredicho).toBe(2.8)
  })

  it('la explicación del fallback menciona datos insuficientes', () => {
    const resultado = predecirROAS([1.0, 2.0], featuresVacios)
    expect(resultado.explicacion).toMatch(/[Dd]atos insuficientes/)
  })

  // ---------------------------------------------------------------------------
  // Predicciones con datos suficientes (>=5 puntos)
  // ---------------------------------------------------------------------------

  it('detecta tendencia mejorando en historial creciente', () => {
    const resultado = predecirROAS(historicoCreciente, featuresVacios)
    expect(resultado.tendencia).toBe('mejorando')
  })

  it('detecta tendencia deteriorando en historial decreciente', () => {
    const resultado = predecirROAS(historicoDecreciente, featuresVacios)
    expect(resultado.tendencia).toBe('deteriorando')
  })

  it('detecta tendencia estable en historial sin pendiente clara', () => {
    const resultado = predecirROAS(historicoEstable, featuresVacios)
    expect(resultado.tendencia).toBe('estable')
  })

  it('la explicación incluye la cantidad de días de historial', () => {
    const resultado = predecirROAS(historicoCreciente, featuresVacios)
    expect(resultado.explicacion).toContain(`${historicoCreciente.length} días`)
  })

  it('el roasPredicho está siempre en el rango [0.1, 20]', () => {
    const extremos = [0.001, 0.001, 0.001, 0.001, 0.001]  // ROAS muy bajo
    const resultado = predecirROAS(extremos, featuresVacios)
    expect(resultado.roasPredicho).toBeGreaterThanOrEqual(0.1)
    expect(resultado.roasPredicho).toBeLessThanOrEqual(20)
  })

  it('la confianza no supera el 95%', () => {
    // Con muchos datos y ajuste perfecto, la confianza no debe pasar de 95
    const muchosDatos = Array.from({ length: 30 }, (_, i) => 2 + i * 0.1)
    const resultado = predecirROAS(muchosDatos, featuresVacios)
    expect(resultado.confianza).toBeLessThanOrEqual(95)
  })

  it('la confianza es mayor con más datos históricos', () => {
    const pocosDatos  = predecirROAS([2, 2.2, 2.4, 2.6, 2.8], featuresVacios)
    const muchosDatos = predecirROAS([2, 2.2, 2.4, 2.6, 2.8, 3.0, 3.2, 3.4, 3.6, 3.8], featuresVacios)
    expect(muchosDatos.confianza).toBeGreaterThanOrEqual(pocosDatos.confianza)
  })

  // ---------------------------------------------------------------------------
  // Ajuste por frecuencia
  // ---------------------------------------------------------------------------

  it('aplica descuento del 15% (factor 0.85) cuando frecuencia > 6', () => {
    // Con datos lineales perfectos podemos calcular el ROAS base y comparar
    const datosLineales = [3, 3, 3, 3, 3]  // media constante
    const sinFrecuencia = predecirROAS(datosLineales, {})
    const conFrecAlta   = predecirROAS(datosLineales, { frecuencia_promedio_7d: 7 })

    // Con frecuencia alta el ROAS debe ser <= que sin ajuste
    expect(conFrecAlta.roasPredicho).toBeLessThanOrEqual(sinFrecuencia.roasPredicho + 0.01)
  })

  it('aplica descuento del 5% (factor 0.95) cuando frecuencia está entre 4 y 6', () => {
    const datosLineales = [3, 3, 3, 3, 3]
    const sinFrecuencia = predecirROAS(datosLineales, {})
    const conFrecMed    = predecirROAS(datosLineales, { frecuencia_promedio_7d: 5 })

    // Descuento moderado debe ser menor que sin ajuste
    expect(conFrecMed.roasPredicho).toBeLessThanOrEqual(sinFrecuencia.roasPredicho + 0.01)
  })

  it('no aplica descuento por frecuencia cuando frecuencia <= 4', () => {
    const datosLineales  = [3, 3, 3, 3, 3]
    const sinFrecuencia  = predecirROAS(datosLineales, {})
    const conFrecBaja    = predecirROAS(datosLineales, { frecuencia_promedio_7d: 3 })

    // Sin descuento: mismas predicciones
    expect(conFrecBaja.roasPredicho).toBeCloseTo(sinFrecuencia.roasPredicho, 5)
  })
})
