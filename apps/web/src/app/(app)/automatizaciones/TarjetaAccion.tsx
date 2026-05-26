'use client'

import { useState } from 'react'
import {
  CheckCircle2, Clock, XCircle,
  TrendingDown, TrendingUp, Pause, Eye,
  ChevronDown, ChevronUp, Zap,
} from 'lucide-react'
import { cn, formatearMoneda } from '@/lib/utils'

export interface AccionAgente {
  id: string
  tipo_accion: string
  descripcion: string | null
  confianza: number | null
  estado: string
  resultado: Record<string, unknown> | null
  aprobado_por: string | null
  campaign_id: string | null
  created_at: string
  campaigns?: { nombre: string } | null
}

export function configAccion(tipo: string): { label: string; icono: React.ComponentType<{ className?: string }>; color: string } {
  switch (tipo) {
    case 'pausar_campaña':       return { label: 'Pausar campaña',       icono: Pause,       color: 'text-red-400' }
    case 'reducir_presupuesto':  return { label: 'Reducir presupuesto',  icono: TrendingDown, color: 'text-orange-400' }
    case 'aumentar_presupuesto': return { label: 'Aumentar presupuesto', icono: TrendingUp,   color: 'text-green-400' }
    case 'solo_monitorear':      return { label: 'Solo monitorear',      icono: Eye,          color: 'text-blue-400' }
    default:                     return { label: tipo,                   icono: Zap,          color: 'text-muted-foreground' }
  }
}

export function configEstado(estado: string): { label: string; color: string; bg: string; Icono: React.ComponentType<{ className?: string }> } {
  switch (estado) {
    case 'completado': return { label: 'Completado', color: 'text-success',    bg: 'bg-success/10 border-success/20',       Icono: CheckCircle2 }
    case 'pendiente':  return { label: 'Pendiente',  color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', Icono: Clock }
    case 'rechazado':  return { label: 'Rechazado',  color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20',       Icono: XCircle }
    default:           return { label: estado,       color: 'text-muted-foreground', bg: 'bg-muted/20 border-border',       Icono: Clock }
  }
}

export function tiempoRelativo(fechaISO: string): string {
  const diff = Date.now() - new Date(fechaISO).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

interface PropsTarjetaAccion {
  accion: AccionAgente
  onAprobar: (id: string) => void
}

export default function TarjetaAccion({ accion, onAprobar }: PropsTarjetaAccion) {
  const [expandida, setExpandida] = useState(false)
  const [aprobando, setAprobando] = useState(false)
  const cfg = configAccion(accion.tipo_accion)
  const est = configEstado(accion.estado)
  const EstIcono = est.Icono
  const AccIcono = cfg.icono

  async function aprobar() {
    setAprobando(true)
    try {
      const res = await fetch('/api/agente/aprobar-accion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion_id: accion.id, campaign_id: accion.campaign_id }),
      })
      if (res.ok) onAprobar(accion.id)
    } finally {
      setAprobando(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-muted/20 shrink-0">
              <AccIcono className={cn('w-4 h-4', cfg.color)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">{cfg.label}</p>
                <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', est.bg, est.color)}>
                  <EstIcono className="w-3 h-3 inline mr-1" />
                  {est.label}
                </span>
              </div>
              {accion.campaigns && (
                <p className="text-xs text-muted-foreground mt-0.5">{accion.campaigns.nombre}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {accion.confianza && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Confianza</p>
                <p className="text-sm font-bold text-foreground">{accion.confianza}%</p>
              </div>
            )}
            <button
              onClick={() => setExpandida(!expandida)}
              className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
            >
              {expandida ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted-foreground">{tiempoRelativo(accion.created_at)}</p>
          {accion.estado === 'pendiente' && (
            <button
              onClick={aprobar}
              disabled={aprobando}
              className="flex items-center gap-1.5 text-xs font-medium bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {aprobando ? 'Ejecutando…' : 'Aprobar y ejecutar'}
            </button>
          )}
        </div>
      </div>

      {expandida && (
        <div className="border-t border-border bg-background/50 px-5 py-4 space-y-3">
          {accion.descripcion && (
            <div>
              <p className="text-xs font-medium text-foreground mb-1">Análisis del agente</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{accion.descripcion}</p>
            </div>
          )}
          {accion.resultado && (
            <div>
              <p className="text-xs font-medium text-foreground mb-1">Resultado</p>
              <div className="text-xs text-muted-foreground space-y-1">
                {typeof accion.resultado.mensaje === 'string' && (
                  <p>{accion.resultado.mensaje}</p>
                )}
                {typeof accion.resultado.presupuestoAnterior === 'number' && (
                  <p>Presupuesto: {formatearMoneda(accion.resultado.presupuestoAnterior as number)} → {formatearMoneda(accion.resultado.presupuestoNuevo as number)}</p>
                )}
              </div>
            </div>
          )}
          {accion.aprobado_por && (
            <p className="text-xs text-muted-foreground">
              Ejecutado por: <span className="font-medium text-foreground">
                {accion.aprobado_por === 'agente_autonomo' ? 'Agente IA (autónomo)' : accion.aprobado_por}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
