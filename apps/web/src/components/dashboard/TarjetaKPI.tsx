'use client'

import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

// Tipos de la tarjeta KPI individual
interface PropsTarjetaKPI {
  titulo: string          // Nombre de la métrica: "ROAS", "Gasto", etc.
  valor: string           // Valor ya formateado: "$38.972,45", "4,2x", "2,8%"
  variacion: number       // Variación porcentual: +12.3, -8.5, 0
  periodo: string         // Período de comparación: "vs últimos 7 días"
  icono: React.ReactNode  // Componente de lucide-react
  cargando?: boolean      // Mostrar skeleton de carga si es true
}

// Retorna clase de color y componente de flecha según la variación
function obtenerEstiloVariacion(variacion: number): {
  claseColor: string
  Icono: React.ElementType
  signo: string
} {
  if (variacion > 0) {
    return {
      claseColor: 'text-emerald-400',
      Icono: ArrowUp,
      signo: '+',
    }
  }
  if (variacion < 0) {
    return {
      claseColor: 'text-red-400',
      Icono: ArrowDown,
      signo: '',
    }
  }
  return {
    claseColor: 'text-muted-foreground',
    Icono: Minus,
    signo: '',
  }
}

// Formatea el número de variación al estilo español: "+18,6%" o "−22,5%"
function formatearVariacion(variacion: number, signo: string): string {
  const absoluto = Math.abs(variacion).toFixed(1).replace('.', ',')
  return `${signo}${absoluto}%`
}

// Componente de tarjeta KPI individual — Client Component para estados hover
export default function TarjetaKPI({
  titulo,
  valor,
  variacion,
  periodo,
  icono,
  cargando = false,
}: PropsTarjetaKPI) {
  const { claseColor, Icono, signo } = obtenerEstiloVariacion(variacion)
  const textoVariacion = formatearVariacion(variacion, signo)

  return (
    <article
      className={cn(
        'bg-card border border-border rounded-xl p-5',
        'hover:border-primary/30 transition-colors',
        'flex flex-col gap-3'
      )}
      aria-label={`Métrica ${titulo}: ${valor}`}
    >
      {/* Fila superior: título + icono */}
      <div className="flex items-start justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {titulo}
        </p>

        {/* Círculo con icono de la métrica */}
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 flex-shrink-0"
          aria-hidden="true"
        >
          {icono}
        </div>
      </div>

      {/* Valor principal */}
      {cargando ? (
        <div className="h-8 bg-muted/20 rounded-md animate-pulse" aria-hidden="true" />
      ) : (
        <p className="text-2xl font-bold text-foreground leading-none">
          {valor}
        </p>
      )}

      {/* Fila inferior: variación + período */}
      {cargando ? (
        <div className="h-4 w-20 bg-muted/10 rounded-md animate-pulse" aria-hidden="true" />
      ) : (
        <div
          className="flex items-center gap-1 flex-wrap"
          aria-label={`Variación: ${textoVariacion} ${periodo}`}
        >
          <span className={cn('flex items-center gap-0.5 text-xs font-semibold', claseColor)}>
            <Icono size={12} aria-hidden="true" />
            {textoVariacion}
          </span>
          <span className="text-xs text-muted-foreground">
            · {periodo}
          </span>
        </div>
      )}
    </article>
  )
}
