'use client'

// Componente cliente — botón flotante + panel deslizante de insights IA
// El panel se superpone al contenido sin afectar el layout del dashboard

import { useState } from 'react'
import {
  Sparkles,
  X,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Zap,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoInsight = 'oportunidad' | 'advertencia' | 'logro' | 'prediccion'

export interface Insight {
  id: string
  tipo: TipoInsight
  titulo: string
  descripcion: string
  confianza: number     // 0-100, nivel de certeza del agente IA
  accion: string | null // texto del botón CTA; null si no hay acción disponible
  timestamp: string     // cadena relativa legible, ej. "hace 15 min"
}

interface PropsSidebarInsights {
  insights: Insight[]
}

// ─── Configuración visual por tipo de insight ─────────────────────────────────

const CONFIG_TIPO: Record<
  TipoInsight,
  {
    color: string
    bg: string
    icono: React.ComponentType<{ className?: string }>
    label: string
  }
> = {
  oportunidad: {
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10',
    icono: Lightbulb,
    label: 'Oportunidad',
  },
  advertencia: {
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    icono: AlertTriangle,
    label: 'Advertencia',
  },
  logro: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    icono: TrendingUp,
    label: 'Logro',
  },
  prediccion: {
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    icono: Zap,
    label: 'Predicción',
  },
}

// ─── Subcomponente: tarjeta de un insight individual ─────────────────────────

interface PropsInsightItem {
  insight: Insight
}

function InsightItem({ insight }: PropsInsightItem) {
  const config = CONFIG_TIPO[insight.tipo]
  const IconoTipo = config.icono

  return (
    <div className="bg-[#0f1319] rounded-xl p-4 space-y-2 border border-[#2d3748] hover:border-indigo-500/30 transition-colors">
      {/* Cabecera: icono + etiqueta de tipo + barra de confianza + título */}
      <div className="flex items-start gap-2">
        {/* Icono del tipo */}
        <div className={cn('p-1.5 rounded-lg shrink-0', config.bg)}>
          <IconoTipo className={cn('w-3.5 h-3.5', config.color)} aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Etiqueta + barra de confianza */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-xs font-medium', config.color)}>
              {config.label}
            </span>

            {/* Barra de confianza visual */}
            <div className="flex items-center gap-1" aria-label={`Confianza ${insight.confianza}%`}>
              <div className="w-12 h-1 bg-[#2d3748] rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', config.bg)}
                  style={{ width: `${insight.confianza}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-xs text-[#9ca3af]">{insight.confianza}%</span>
            </div>
          </div>

          {/* Título del insight */}
          <p className="text-sm font-semibold text-white mt-0.5">{insight.titulo}</p>
        </div>
      </div>

      {/* Descripción completa */}
      <p className="text-xs text-[#9ca3af] leading-relaxed">{insight.descripcion}</p>

      {/* Pie: timestamp y botón de acción (CTA) */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-[#9ca3af]">{insight.timestamp}</span>

        {insight.accion && (
          <button
            className={cn(
              'flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80',
              config.color,
            )}
            aria-label={`${insight.accion}: ${insight.titulo}`}
          >
            {insight.accion}
            <ChevronRight className="w-3 h-3" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SidebarInsightsIA({ insights }: PropsSidebarInsights) {
  const [panelAbierto, setPanelAbierto] = useState(false)

  const abrirPanel = () => setPanelAbierto(true)
  const cerrarPanel = () => setPanelAbierto(false)

  return (
    <>
      {/* Overlay semitransparente — cierra el panel al hacer click fuera */}
      {panelAbierto && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={cerrarPanel}
          aria-hidden="true"
        />
      )}

      {/* ── Panel deslizante desde la derecha ─────────────────────────────── */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full sm:w-80 bg-[#1a1f2e] border-l border-[#2d3748]',
          'shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out',
          panelAbierto ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Panel de insights IA"
      >
        {/* Encabezado del panel */}
        <div className="flex items-center justify-between p-5 border-b border-[#2d3748] shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" aria-hidden="true" />
            <h2 className="text-base font-semibold text-white">Insights IA</h2>
            {/* Contador de insights disponibles */}
            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {insights.length} nuevos
            </span>
          </div>

          {/* Botón de cierre */}
          <button
            onClick={cerrarPanel}
            className="p-1.5 rounded-lg text-[#9ca3af] hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Cerrar panel de insights"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Descripción del panel */}
        <div className="px-5 py-3 border-b border-[#2d3748] bg-indigo-500/5 shrink-0">
          <p className="text-xs text-[#9ca3af] leading-relaxed">
            Análisis generado automáticamente por el agente IA basado en el
            rendimiento de tus campañas.
          </p>
        </div>

        {/* Lista de insights con scroll interno */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {insights.length === 0 ? (
            // Estado vacío — sin insights disponibles
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
              <Sparkles className="w-8 h-8 text-[#9ca3af]" aria-hidden="true" />
              <p className="text-sm text-[#9ca3af]">
                No hay insights disponibles por el momento.
              </p>
            </div>
          ) : (
            insights.map((insight) => (
              <InsightItem key={insight.id} insight={insight} />
            ))
          )}
        </div>

        {/* Pie del panel */}
        <div className="p-4 border-t border-[#2d3748] shrink-0">
          <p className="text-xs text-[#9ca3af] text-center">
            Actualizado hace 15 min ·{' '}
            <span className="text-indigo-400 cursor-pointer hover:underline">
              Pedir análisis manual
            </span>
          </p>
        </div>
      </div>

      {/* ── Botón flotante ────────────────────────────────────────────────────── */}
      {/* Se oculta cuando el panel ya está abierto para no superponerse al overlay */}
      <button
        onClick={abrirPanel}
        className={cn(
          'fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-2xl z-30',
          'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25',
          'hover:bg-indigo-600 hover:shadow-indigo-500/40 hover:shadow-xl',
          'transition-all duration-200',
          // Ocultar sin desmontar para mantener el estado del panel
          panelAbierto && 'opacity-0 pointer-events-none',
        )}
        aria-label="Abrir panel de insights generados por IA"
        tabIndex={panelAbierto ? -1 : 0}
      >
        <Sparkles className="w-4 h-4" aria-hidden="true" />
        <span className="text-sm font-medium">IA</span>

        {/* Insignia con el número de insights */}
        {insights.length > 0 && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-indigo-500 text-xs font-bold">
            {insights.length}
          </span>
        )}
      </button>
    </>
  )
}
