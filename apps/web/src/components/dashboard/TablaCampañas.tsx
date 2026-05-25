'use client'

// Componente cliente — tabla de top campañas con ordenamiento interactivo por columna

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn, formatearMoneda, formatearNumero } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Campos por los que se puede ordenar la tabla
type CampoOrden = 'gasto' | 'roas' | 'ctr' | 'conversiones' | 'cpa'

// Dirección del ordenamiento: ascendente, descendente o sin orden
type DireccionOrden = 'asc' | 'desc' | null

export interface DatoCampaña {
  id: string
  nombre: string
  tipo: string
  estado: 'activa' | 'pausada'
  gasto: number
  roas: number
  ctr: number
  conversiones: number
  cpa: number
}

interface PropsTablaCampañas {
  campañas: DatoCampaña[]
}

// ─── Colores de badge por tipo de campaña ─────────────────────────────────────

// Mapa de clases Tailwind para cada tipo de campaña conocido
const COLORES_TIPO: Record<string, string> = {
  'Prospección': 'bg-primary/10 text-primary border-primary/20',
  'Remarketing':  'bg-secondary/10 text-secondary border-secondary/20',
  'Retargeting':  'bg-accent/10 text-accent border-accent/20',
  'Conversión':   'bg-success/10 text-success border-success/20',
}

// ─── Columnas ordenables ──────────────────────────────────────────────────────

// Definición de las columnas que permiten ordenamiento
const COLUMNAS_ORDENABLES: { campo: CampoOrden; label: string }[] = [
  { campo: 'gasto',       label: 'Gasto' },
  { campo: 'roas',        label: 'ROAS' },
  { campo: 'ctr',         label: 'CTR' },
  { campo: 'conversiones', label: 'Conv.' },
  { campo: 'cpa',         label: 'CPA' },
]

// ─── Componente ───────────────────────────────────────────────────────────────

export default function TablaCampañas({ campañas }: PropsTablaCampañas) {
  // Estado de ordenamiento — por defecto: gasto descendente
  const [campoOrden, setCampoOrden] = useState<CampoOrden>('gasto')
  const [direccionOrden, setDireccionOrden] = useState<DireccionOrden>('desc')

  /**
   * Cicla el ordenamiento de una columna:
   * sin orden → desc → asc → reset a gasto desc
   */
  function alternarOrden(campo: CampoOrden) {
    if (campoOrden === campo) {
      // Misma columna: ciclo desc → asc → reset
      if (direccionOrden === 'desc') {
        setDireccionOrden('asc')
      } else {
        // Vuelve al estado por defecto
        setCampoOrden('gasto')
        setDireccionOrden('desc')
      }
    } else {
      // Nueva columna: empieza en descendente
      setCampoOrden(campo)
      setDireccionOrden('desc')
    }
  }

  // Campañas ordenadas según el estado actual — memorizado para rendimiento
  const campañasOrdenadas = useMemo(() => {
    if (!direccionOrden) return campañas
    return [...campañas].sort((a, b) => {
      const diff = a[campoOrden] - b[campoOrden]
      return direccionOrden === 'asc' ? diff : -diff
    })
  }, [campañas, campoOrden, direccionOrden])

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">

      {/* ── Encabezado de la card ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-6 pb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Top Campañas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ordenado por rendimiento · {campañas.length} campañas activas
          </p>
        </div>
        {/* Botón placeholder — se conectará con vista completa en paso posterior */}
        <button className="text-xs text-primary hover:underline transition-opacity">
          Ver todas →
        </button>
      </div>

      {/* ── Tabla con scroll horizontal en móvil ──────────────────────────── */}
      <div className="overflow-x-auto">
        <table
          className="w-full text-sm"
          role="grid"
          aria-label="Tabla de campañas"
        >
          <thead>
            <tr className="border-t border-border">

              {/* Columna Campaña — no ordenable */}
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                Campaña
              </th>

              {/* Columna Estado — no ordenable */}
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                Estado
              </th>

              {/* Columnas ordenables — generadas dinámicamente */}
              {COLUMNAS_ORDENABLES.map(({ campo, label }) => (
                <th key={campo} className="text-right px-4 py-3 whitespace-nowrap">
                  <button
                    onClick={() => alternarOrden(campo)}
                    className={cn(
                      'flex items-center gap-1 text-xs font-medium uppercase tracking-wider ml-auto transition-colors',
                      campoOrden === campo
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    aria-label={`Ordenar por ${label}`}
                  >
                    {label}
                    {/* Indicador de dirección del ordenamiento */}
                    {campoOrden === campo ? (
                      direccionOrden === 'desc'
                        ? <ChevronDown className="w-3 h-3" />
                        : <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {campañasOrdenadas.map((campaña) => (
              <tr
                key={campaña.id}
                className="hover:bg-background/50 transition-colors"
              >
                {/* ── Nombre + badge de tipo ─────────────────────────── */}
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground truncate max-w-48">
                      {campaña.nombre}
                    </span>
                    <span
                      className={cn(
                        'inline-flex w-fit text-xs px-2 py-0.5 rounded-full border',
                        COLORES_TIPO[campaña.tipo] ??
                          'bg-muted/10 text-muted-foreground border-border'
                      )}
                    >
                      {campaña.tipo}
                    </span>
                  </div>
                </td>

                {/* ── Pill de estado ─────────────────────────────────── */}
                <td className="px-4 py-4">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
                      campaña.estado === 'activa'
                        ? 'bg-success/10 text-success'
                        : 'bg-muted/20 text-muted-foreground'
                    )}
                  >
                    {/* Indicador de color puntual */}
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        campaña.estado === 'activa'
                          ? 'bg-success'
                          : 'bg-muted-foreground'
                      )}
                      aria-hidden="true"
                    />
                    {campaña.estado === 'activa' ? 'Activa' : 'Pausada'}
                  </span>
                </td>

                {/* ── Gasto ──────────────────────────────────────────── */}
                <td className="px-4 py-4 text-right text-sm text-foreground font-medium">
                  {formatearMoneda(campaña.gasto)}
                </td>

                {/* ── ROAS con color semántico ────────────────────────── */}
                <td className="px-4 py-4 text-right">
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      campaña.roas >= 3
                        ? 'text-success'
                        : campaña.roas >= 1.5
                          ? 'text-warning'
                          : 'text-destructive'
                    )}
                  >
                    {campaña.roas.toFixed(1).replace('.', ',')}x
                  </span>
                </td>

                {/* ── CTR ────────────────────────────────────────────── */}
                <td className="px-4 py-4 text-right text-sm text-foreground">
                  {campaña.ctr.toFixed(1).replace('.', ',')}%
                </td>

                {/* ── Conversiones ───────────────────────────────────── */}
                <td className="px-4 py-4 text-right text-sm text-foreground">
                  {formatearNumero(campaña.conversiones)}
                </td>

                {/* ── CPA ────────────────────────────────────────────── */}
                <td className="px-4 py-4 text-right text-sm text-foreground">
                  {formatearMoneda(campaña.cpa)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
