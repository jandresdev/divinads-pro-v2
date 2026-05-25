'use client'

// Gráfico de dona interactivo para mostrar la distribución del presupuesto
// por tipo de campaña. Usa Recharts v2 con tooltip y leyenda personalizados.

import { useState } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { cn, formatearMoneda } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SegmentoPresupuesto {
  tipo: string        // Ej: "Prospección"
  color: string       // Ej: "#6366f1"
  porcentaje: number  // Ej: 45
  monto: number       // Ej: 17537.60
}

export interface PropsGraficoPresupuesto {
  total: number
  distribución: SegmentoPresupuesto[]
}

// ─── Tooltip personalizado ────────────────────────────────────────────────────

function TooltipPresupuesto({ active, payload }: {
  active?: boolean
  payload?: Array<{ payload: SegmentoPresupuesto }>
}) {
  if (!active || !payload?.length) return null

  const d = payload[0].payload

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      {/* Nombre del segmento */}
      <p className="text-sm font-semibold text-foreground mb-1">{d.tipo}</p>
      {/* Monto en USD */}
      <p className="text-sm text-foreground">{formatearMoneda(d.monto)}</p>
      {/* Porcentaje del total */}
      <p className="text-xs text-muted-foreground">{d.porcentaje}% del presupuesto</p>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GraficoPresupuesto({
  total,
  distribución,
}: PropsGraficoPresupuesto) {
  // Índice del segmento activo durante el hover (null = ninguno)
  const [segmentoActivo, setSegmentoActivo] = useState<number | null>(null)

  return (
    <div className="bg-card border border-border rounded-xl p-6 h-full flex flex-col">
      {/* Encabezado */}
      <h2 className="text-base font-semibold text-foreground">
        Asignación de Presupuesto
      </h2>
      <p className="text-xs text-muted-foreground mt-0.5 mb-4">Últimos 30 días</p>

      {/* Contenedor relativo: dona + texto central superpuesto */}
      <div className="relative flex-shrink-0">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={distribución}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              dataKey="monto"
              paddingAngle={2}
              onMouseEnter={(_, index) => setSegmentoActivo(index)}
              onMouseLeave={() => setSegmentoActivo(null)}
              stroke="transparent"
            >
              {distribución.map((segmento, index) => (
                <Cell
                  key={segmento.tipo}
                  fill={segmento.color}
                  // Segmento activo opacidad plena; los demás se atenúan
                  opacity={
                    segmentoActivo === null || segmentoActivo === index ? 1 : 0.45
                  }
                  stroke="transparent"
                  style={{ transition: 'opacity 150ms ease', cursor: 'pointer' }}
                />
              ))}
            </Pie>
            {/* Tooltip con componente personalizado */}
            <Tooltip
              content={<TooltipPresupuesto />}
              isAnimationActive={false}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Texto central superpuesto sobre el hueco de la dona */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <p className="text-xs text-muted-foreground leading-none mb-1">Total</p>
          <p className="text-lg font-bold text-foreground leading-none">
            {formatearMoneda(total)}
          </p>
        </div>
      </div>

      {/* Leyenda personalizada — una fila por tipo de campaña */}
      <div className="space-y-1 mt-3 flex-1">
        {distribución.map((segmento, index) => (
          <div
            key={segmento.tipo}
            className={cn(
              'flex items-center justify-between py-1.5 rounded-lg px-2 transition-colors cursor-default select-none',
              segmentoActivo === index
                ? 'bg-muted/30'
                : 'hover:bg-muted/10'
            )}
            onMouseEnter={() => setSegmentoActivo(index)}
            onMouseLeave={() => setSegmentoActivo(null)}
          >
            {/* Cuadrado de color + nombre del segmento */}
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: segmento.color }}
                aria-hidden="true"
              />
              <span className="text-sm text-foreground truncate">
                {segmento.tipo}
              </span>
            </div>

            {/* Porcentaje y monto a la derecha */}
            <div className="flex items-center gap-3 text-sm flex-shrink-0 ml-2">
              <span className="text-muted-foreground w-8 text-right">
                {segmento.porcentaje}%
              </span>
              <span className="font-medium text-foreground w-24 text-right tabular-nums">
                {formatearMoneda(segmento.monto)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
