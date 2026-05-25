'use client'

// Gráfico de líneas multi-métrica con toggle de métricas activas
// Muestra Gasto, ROAS y Conversiones de los últimos 30 días

import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { subDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface DatoPunto {
  fecha: string        // "24/05"
  gasto: number        // USD
  roas: number         // multiplicador
  conversiones: number
}

interface PropsGrafico {
  datos: DatoPunto[]
}

// Prop del tooltip de Recharts (tipos permisivos para compatibilidad con la API de Recharts)
interface PropsTooltip {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: string
}

// ─── Configuración de métricas ────────────────────────────────────────────────

const CONFIGURACION_METRICAS = [
  {
    clave: 'gasto',
    etiqueta: 'Gasto',
    color: '#6366f1',       // primary
    formato: 'moneda' as const,
    eje: 'izquierdo' as const,
  },
  {
    clave: 'roas',
    etiqueta: 'ROAS',
    color: '#10b981',       // success
    formato: 'multiplicador' as const,
    eje: 'derecho' as const,
  },
  {
    clave: 'conversiones',
    etiqueta: 'Conversiones',
    color: '#8b5cf6',       // secondary
    formato: 'numero' as const,
    eje: 'izquierdo' as const,
  },
] as const

// ─── Helper: datos demo 30 días ───────────────────────────────────────────────

/**
 * Genera una serie de 30 puntos de datos de ejemplo con variabilidad aleatoria.
 * Se usa cuando Supabase no devuelve datos reales.
 */
export function generarDatosDemo30Dias(): DatoPunto[] {
  const hoy = new Date()
  return Array.from({ length: 30 }, (_, i) => {
    const fecha = subDays(hoy, 29 - i)
    const variabilidad = 0.85 + Math.random() * 0.3
    return {
      fecha: format(fecha, 'dd/MM', { locale: es }),
      gasto: Math.round(1200 * variabilidad * 100) / 100,
      roas: Math.round(4.2 * variabilidad * 10) / 10,
      conversiones: Math.round(42 * variabilidad),
    }
  })
}

// ─── Tooltip personalizado ────────────────────────────────────────────────────

/**
 * Tooltip del gráfico completamente en español.
 * Formatea cada métrica según su tipo: moneda, multiplicador o entero.
 */
function TooltipPersonalizado({ active, payload, label }: PropsTooltip) {
  if (!active || !payload?.length) return null

  return (
    <div
      className="bg-card border border-border rounded-lg p-3 shadow-lg"
      role="tooltip"
    >
      <p className="text-xs text-muted-foreground mb-2 font-medium">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs mb-1 last:mb-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
            aria-hidden="true"
          />
          <span className="text-muted-foreground">
            {entry.dataKey === 'gasto'
              ? 'Gasto'
              : entry.dataKey === 'roas'
              ? 'ROAS'
              : 'Conv.'}
            :
          </span>
          <span className="font-medium text-foreground">
            {entry.dataKey === 'gasto'
              ? `$${entry.value.toFixed(2).replace('.', ',')}`
              : entry.dataKey === 'roas'
              ? `${entry.value.toFixed(1).replace('.', ',')}x`
              : entry.value.toString()}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * Gráfico de líneas multi-métrica para el dashboard de campañas.
 * Permite activar/desactivar cada métrica mediante botones toggle.
 * Usa ejes dobles: izquierdo para Gasto/Conversiones, derecho para ROAS.
 */
export default function GraficoMultimetrica({ datos }: PropsGrafico) {
  // Estado: qué métricas están visibles en el gráfico
  const [metricasActivas, setMetricasActivas] = useState<string[]>([
    'gasto',
    'roas',
    'conversiones',
  ])

  // Alterna una métrica entre activa e inactiva
  function toggleMetrica(clave: string) {
    setMetricasActivas((prev) =>
      prev.includes(clave)
        ? prev.filter((m) => m !== clave)
        : [...prev, clave]
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      {/* ── Encabezado ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Rendimiento de Campañas
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Últimos 30 días · Actualización cada 15 min
          </p>
        </div>

        {/* Selector de granularidad — visual placeholder, se conectará en pasos posteriores */}
        <div
          className="flex items-center gap-1 p-1 bg-background rounded-lg border border-border"
          role="group"
          aria-label="Granularidad del gráfico"
        >
          {(['Diario', 'Semanal'] as const).map((granularidad) => (
            <button
              key={granularidad}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md transition-colors',
                granularidad === 'Diario'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-pressed={granularidad === 'Diario'}
            >
              {granularidad}
            </button>
          ))}
        </div>
      </div>

      {/* ── Botones toggle de métricas ────────────────────────────────────── */}
      <div
        className="flex flex-wrap gap-2 mb-4"
        role="group"
        aria-label="Seleccionar métricas visibles"
      >
        {CONFIGURACION_METRICAS.map((metrica) => {
          const activa = metricasActivas.includes(metrica.clave)
          return (
            <button
              key={metrica.clave}
              onClick={() => toggleMetrica(metrica.clave)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                activa
                  ? 'text-foreground'
                  : 'border-border text-muted-foreground bg-transparent hover:text-foreground'
              )}
              style={
                activa
                  ? {
                      backgroundColor: `${metrica.color}20`,
                      borderColor: `${metrica.color}40`,
                    }
                  : {}
              }
              aria-pressed={activa}
              aria-label={`${activa ? 'Ocultar' : 'Mostrar'} métrica ${metrica.etiqueta}`}
            >
              {/* Indicador de color de la métrica */}
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: activa ? metrica.color : '#4a5568' }}
                aria-hidden="true"
              />
              {metrica.etiqueta}
              {/* Marca de verificación cuando la métrica está activa */}
              {activa && (
                <svg
                  className="w-3 h-3 ml-0.5"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke={metrica.color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Gráfico Recharts ─────────────────────────────────────────────── */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={datos} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          {/* Solo cuadrícula horizontal, tenue */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#2d3748"
            vertical={false}
          />

          {/* Eje X: fechas — muestra una etiqueta cada 5 días */}
          <XAxis
            dataKey="fecha"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={4}
          />

          {/* Eje Y izquierdo: Gasto (USD) y Conversiones */}
          <YAxis
            yAxisId="izquierdo"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
            }
            width={48}
          />

          {/* Eje Y derecho: ROAS (multiplicador) */}
          <YAxis
            yAxisId="derecho"
            orientation="right"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}x`}
            domain={[0, 8]}
            width={36}
          />

          {/* Tooltip personalizado en español */}
          <Tooltip
            content={<TooltipPersonalizado />}
            cursor={{ stroke: '#2d3748', strokeWidth: 1 }}
          />

          {/* Línea: Gasto */}
          {metricasActivas.includes('gasto') && (
            <Line
              yAxisId="izquierdo"
              type="monotone"
              dataKey="gasto"
              name="Gasto"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#6366f1' }}
            />
          )}

          {/* Línea: ROAS */}
          {metricasActivas.includes('roas') && (
            <Line
              yAxisId="derecho"
              type="monotone"
              dataKey="roas"
              name="ROAS"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#10b981' }}
            />
          )}

          {/* Línea: Conversiones */}
          {metricasActivas.includes('conversiones') && (
            <Line
              yAxisId="izquierdo"
              type="monotone"
              dataKey="conversiones"
              name="Conversiones"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#8b5cf6' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
