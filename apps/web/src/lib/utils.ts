import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Combina clases de Tailwind de forma segura, resolviendo conflictos
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// Formatea moneda en español (USD): $38.972,45
export function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(valor)
}

// Formatea número con punto para miles: 38.972
export function formatearNumero(valor: number): string {
  return new Intl.NumberFormat('es-ES').format(valor)
}

// Formatea porcentaje con signo: +18,6% / -3,2%
export function formatearPorcentaje(valor: number): string {
  const signo = valor > 0 ? '+' : ''
  return `${signo}${valor.toFixed(1).replace('.', ',')}%`
}
