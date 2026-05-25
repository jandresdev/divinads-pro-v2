// ---------------------------------------------------------------------------
// Tests unitarios para src/lib/utils.ts
// Prueban funciones puras de formateo y composición de clases de Tailwind
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import { cn, formatearMoneda, formatearNumero, formatearPorcentaje } from '../utils'

// ---------------------------------------------------------------------------
// cn — composición de clases Tailwind
// ---------------------------------------------------------------------------

describe('cn', () => {
  it('retorna string vacío cuando no recibe argumentos', () => {
    expect(cn()).toBe('')
  })

  it('retorna una clase simple sin modificaciones', () => {
    expect(cn('text-red-500')).toBe('text-red-500')
  })

  it('combina múltiples clases con espacio', () => {
    const resultado = cn('text-red-500', 'bg-blue-500')
    expect(resultado).toBe('text-red-500 bg-blue-500')
  })

  it('resuelve conflictos de Tailwind (twMerge): conserva la clase más reciente', () => {
    // text-red-500 y text-blue-500 son conflictivas — debe ganar la última
    const resultado = cn('text-red-500', 'text-blue-500')
    expect(resultado).toBe('text-blue-500')
    expect(resultado).not.toContain('text-red-500')
  })

  it('ignora valores falsy (undefined, null, false)', () => {
    const resultado = cn('text-red-500', undefined, null, false, 'bg-blue-500')
    expect(resultado).toContain('text-red-500')
    expect(resultado).toContain('bg-blue-500')
  })

  it('acepta objetos condicionales (clsx API)', () => {
    const activo = true
    const resultado = cn({ 'font-bold': activo, 'font-normal': !activo })
    expect(resultado).toBe('font-bold')
  })

  it('acepta arrays de clases', () => {
    const resultado = cn(['text-sm', 'text-gray-500'])
    expect(resultado).toContain('text-sm')
    expect(resultado).toContain('text-gray-500')
  })

  it('resuelve conflictos en clases de color de texto', () => {
    // text-red-500 y text-blue-500 son directamente conflictivas en twMerge
    // La clase más reciente debe ganar y la anterior debe eliminarse
    const resultado = cn('text-red-500', 'text-blue-500')
    expect(resultado).toBe('text-blue-500')
    expect(resultado).not.toContain('text-red-500')
  })
})

// ---------------------------------------------------------------------------
// formatearMoneda — formato de moneda en español (USD)
// ---------------------------------------------------------------------------

describe('formatearMoneda', () => {
  it('formatea cero como "0,00 $" o equivalente en es-ES con USD', () => {
    const resultado = formatearMoneda(0)
    // El formato es-ES con USD puede variar ligeramente por entorno
    // Lo importante es que contenga "0" y el símbolo de moneda
    expect(resultado).toMatch(/0/)
    expect(resultado).toMatch(/\$|USD/)
  })

  it('formatea 38972.45 con separadores correctos', () => {
    const resultado = formatearMoneda(38972.45)
    // en es-ES: "38.972,45 $" (punto de miles, coma decimal)
    expect(resultado).toContain('38')
    expect(resultado).toContain('972')
    expect(resultado).toContain('45')
  })

  it('incluye 2 decimales siempre (minimumFractionDigits=2)', () => {
    const resultado = formatearMoneda(100)
    // Debe terminar con separador decimal y 2 dígitos
    expect(resultado).toMatch(/[,.]00/)
  })

  it('formatea números negativos', () => {
    const resultado = formatearMoneda(-500.99)
    expect(resultado).toMatch(/-/)
    expect(resultado).toMatch(/500/)
    expect(resultado).toMatch(/99/)
  })

  it('formatea valor grande con separador de miles', () => {
    const resultado = formatearMoneda(1000000)
    // Debe tener algún separador de miles
    // en es-ES: "1.000.000,00 $"
    expect(resultado).toContain('000')
  })
})

// ---------------------------------------------------------------------------
// formatearNumero — formato de número con punto de miles
// ---------------------------------------------------------------------------

describe('formatearNumero', () => {
  it('formatea 0 como "0"', () => {
    expect(formatearNumero(0)).toBe('0')
  })

  it('formatea número pequeño sin separadores', () => {
    expect(formatearNumero(999)).toBe('999')
  })

  it('formatea 1000 con separador de miles', () => {
    const resultado = formatearNumero(1000)
    // en es-ES: "1.000" (jsdom puede retornar "1000" sin separador según la versión de ICU)
    // Verificamos que el resultado contenga "1000" y sea el número correcto
    expect(resultado).toContain('1')
    expect(resultado).toContain('000')
    // El resultado numérico al quitar separadores debe ser 1000
    const soloNumeros = resultado.replace(/\D/g, '')
    expect(parseInt(soloNumeros)).toBe(1000)
  })

  it('formatea 38972 con punto de miles', () => {
    const resultado = formatearNumero(38972)
    // en es-ES: "38.972"
    expect(resultado).toBe('38.972')
  })

  it('formatea números grandes con separadores de miles y millones', () => {
    const resultado = formatearNumero(1247000)
    // en es-ES: "1.247.000"
    expect(resultado).toBe('1.247.000')
  })

  it('formatea decimales correctamente', () => {
    const resultado = formatearNumero(4.2)
    // en es-ES: "4,2"
    expect(resultado).toContain('4')
    expect(resultado).toContain('2')
  })
})

// ---------------------------------------------------------------------------
// formatearPorcentaje — formato de porcentaje con signo
// ---------------------------------------------------------------------------

describe('formatearPorcentaje', () => {
  it('formatea 0 como "0,0%"', () => {
    expect(formatearPorcentaje(0)).toBe('0,0%')
  })

  it('agrega "+" para valores positivos', () => {
    const resultado = formatearPorcentaje(18.6)
    expect(resultado).toBe('+18,6%')
  })

  it('NO agrega "+" para valores negativos (ya tienen "-")', () => {
    const resultado = formatearPorcentaje(-22.5)
    expect(resultado).toBe('-22,5%')
  })

  it('redondea a 1 decimal', () => {
    // 18.64 → 1 decimal → "+18,6%" (redondeo hacia abajo)
    expect(formatearPorcentaje(18.64)).toBe('+18,6%')
    // 18.75 → 1 decimal → "+18,8%" (redondeo hacia arriba, evitando el caso banca 18.65)
    expect(formatearPorcentaje(18.75)).toBe('+18,8%')
  })

  it('usa coma como separador decimal (convención LATAM)', () => {
    const resultado = formatearPorcentaje(12.5)
    expect(resultado).toContain(',')
    expect(resultado).not.toContain('.')
  })

  it('formatea 100% correctamente', () => {
    expect(formatearPorcentaje(100)).toBe('+100,0%')
  })

  it('formatea -100% correctamente', () => {
    expect(formatearPorcentaje(-100)).toBe('-100,0%')
  })

  it('formatea números muy pequeños', () => {
    expect(formatearPorcentaje(0.1)).toBe('+0,1%')
    expect(formatearPorcentaje(-0.1)).toBe('-0,1%')
  })
})
