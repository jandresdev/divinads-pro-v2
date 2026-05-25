'use client'

// Panel de alertas y anomalías — componente cliente con filtro interactivo
// Muestra alertas por severidad y permite marcarlas como revisadas sin recargar

import { useState } from 'react'
import { AlertTriangle, AlertOctagon, Info, CheckCircle2, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Severidad = 'critica' | 'alta' | 'media' | 'baja'

export interface Alerta {
  id: string
  tipo: string
  severidad: Severidad
  titulo: string
  campaña: string
  descripcion: string
  tiempo: string
  revisada: boolean
}

interface PropsPanelAlertas {
  alertas: Alerta[]
}

// ─── Config visual por nivel de severidad ─────────────────────────────────────

const CONFIG_SEVERIDAD = {
  critica: {
    icono: AlertTriangle,
    borde: 'border-l-red-500',
    iconoColor: 'text-red-500',
    badge: 'bg-red-500/10 text-red-500 border-red-500/20',
    label: 'Crítica',
  },
  alta: {
    icono: AlertOctagon,
    borde: 'border-l-amber-500',
    iconoColor: 'text-amber-500',
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    label: 'Alta',
  },
  media: {
    icono: Info,
    borde: 'border-l-yellow-400',
    iconoColor: 'text-yellow-400',
    badge: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
    label: 'Media',
  },
  baja: {
    icono: Info,
    borde: 'border-l-indigo-500',
    iconoColor: 'text-indigo-400',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    label: 'Baja',
  },
} as const

// ─── Opciones de filtro ───────────────────────────────────────────────────────

const FILTROS = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'critica', etiqueta: 'Críticas' },
  { valor: 'alta', etiqueta: 'Altas' },
] as const

type FiltroActivo = 'todas' | Severidad

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PanelAlertas({ alertas }: PropsPanelAlertas) {
  const [filtroActivo, setFiltroActivo] = useState<FiltroActivo>('todas')

  // Estado local de alertas para marcar como revisada sin recargar la página
  const [alertasLocales, setAlertasLocales] = useState<Alerta[]>(alertas)

  // Cantidad de alertas aún no revisadas (para el badge del header)
  const noRevisadas = alertasLocales.filter((a) => !a.revisada).length

  // Marcar una alerta individual como revisada
  function marcarRevisada(id: string) {
    setAlertasLocales((prev) =>
      prev.map((a) => (a.id === id ? { ...a, revisada: true } : a))
    )
  }

  // Aplicar filtro por severidad (o mostrar todas)
  const alertasFiltradas = alertasLocales.filter((a) => {
    if (filtroActivo === 'todas') return true
    return a.severidad === filtroActivo
  })

  return (
    <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl overflow-hidden h-full flex flex-col">

      {/* ── Header con badge de no revisadas ── */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#9ca3af]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-white">Alertas</h2>

          {/* Badge rojo con el conteo de no revisadas */}
          {noRevisadas > 0 && (
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold"
              aria-label={`${noRevisadas} alertas sin revisar`}
            >
              {noRevisadas}
            </span>
          )}
        </div>
      </div>

      {/* ── Chips de filtro por severidad ── */}
      <div className="flex items-center gap-1.5 px-6 pb-4 shrink-0">
        {FILTROS.map(({ valor, etiqueta }) => (
          <button
            key={valor}
            onClick={() => setFiltroActivo(valor as FiltroActivo)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              filtroActivo === valor
                ? 'bg-indigo-500 text-white'
                : 'bg-white/5 text-[#9ca3af] hover:text-white hover:bg-white/10'
            )}
            aria-pressed={filtroActivo === valor}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {/* ── Lista scrolleable de alertas ── */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#2d3748]">
        {alertasFiltradas.length === 0 ? (
          // Estado vacío: sin alertas para el filtro activo
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-white">Sin alertas activas</p>
            <p className="text-xs text-[#9ca3af] mt-1">
              Todas las campañas funcionan con normalidad
            </p>
          </div>
        ) : (
          alertasFiltradas.map((alerta) => {
            const config = CONFIG_SEVERIDAD[alerta.severidad]
            const IconoSeveridad = config.icono

            return (
              <div
                key={alerta.id}
                className={cn(
                  'p-4 border-l-4 transition-opacity',
                  config.borde,
                  // Las alertas revisadas se muestran atenuadas
                  alerta.revisada ? 'opacity-40' : 'opacity-100'
                )}
              >
                {/* Título + badge de severidad */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <IconoSeveridad
                      className={cn('w-4 h-4 shrink-0 mt-0.5', config.iconoColor)}
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-white leading-snug">
                      {alerta.titulo}
                    </p>
                  </div>

                  {/* Etiqueta de severidad como badge con borde */}
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded border shrink-0',
                      config.badge
                    )}
                  >
                    {config.label}
                  </span>
                </div>

                {/* Nombre de la campaña afectada */}
                <p className="text-xs text-[#9ca3af] ml-6 mb-1 truncate">
                  {alerta.campaña}
                </p>

                {/* Descripción detallada de la anomalía */}
                <p className="text-xs text-[#9ca3af] ml-6 mb-3 leading-relaxed">
                  {alerta.descripcion}
                </p>

                {/* Footer: tiempo relativo + botón para marcar revisada */}
                <div className="flex items-center justify-between ml-6">
                  <span className="text-xs text-[#9ca3af]">{alerta.tiempo}</span>

                  {/* Solo mostrar el botón si la alerta no fue revisada aún */}
                  {!alerta.revisada && (
                    <button
                      onClick={() => marcarRevisada(alerta.id)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      aria-label={`Marcar como revisada: ${alerta.titulo}`}
                    >
                      Marcar revisada
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
