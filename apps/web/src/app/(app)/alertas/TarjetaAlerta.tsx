'use client'

import { useState } from 'react'
import { AlertTriangle, TrendingDown, TrendingUp, Zap, DollarSign, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Anomalia {
  id: string
  tipo: string
  titulo: string
  descripcion: string
  severidad_score: number
  activa: boolean
  revisada: boolean
  created_at: string
  campaigns?: { nombre: string; tipo_campaña: string } | null
}

export function nivelSeveridad(score: number) {
  if (score >= 85) return { label: 'Crítica', color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20' }
  if (score >= 70) return { label: 'Alta',    color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' }
  if (score >= 50) return { label: 'Media',   color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' }
  return               { label: 'Baja',    color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20' }
}

export function tiempoRelativo(fechaISO: string): string {
  const diff = Date.now() - new Date(fechaISO).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

function iconoTipo(tipo: string) {
  if (tipo.includes('roas') || tipo.includes('conversiones')) return TrendingDown
  if (tipo.includes('cpc') || tipo.includes('cpa')) return TrendingUp
  if (tipo.includes('presupuesto')) return DollarSign
  if (tipo.includes('frecuencia')) return Zap
  return AlertTriangle
}

interface PropsTarjetaAlerta {
  alerta: Anomalia
  onRevisada: (id: string) => void
}

export default function TarjetaAlerta({ alerta, onRevisada }: PropsTarjetaAlerta) {
  const [marcando, setMarcando] = useState(false)
  const nivel = nivelSeveridad(alerta.severidad_score)
  const Icono = iconoTipo(alerta.tipo)

  async function marcarRevisada() {
    setMarcando(true)
    try {
      const res = await fetch(`/api/anomalias/${alerta.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisada: true }),
      })
      if (res.ok) onRevisada(alerta.id)
    } finally {
      setMarcando(false)
    }
  }

  return (
    <div className={cn('bg-card border rounded-xl p-5 flex gap-4 transition-opacity', alerta.revisada && 'opacity-60')}>
      <div className={cn('p-2.5 rounded-xl border h-fit shrink-0', nivel.bg)}>
        <Icono className={cn('w-4 h-4', nivel.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', nivel.bg, nivel.color)}>
            {nivel.label} · {alerta.severidad_score}
          </span>
          {alerta.campaigns && (
            <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
              {alerta.campaigns.tipo_campaña}
            </span>
          )}
          {alerta.revisada && (
            <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
              Revisada
            </span>
          )}
        </div>

        <p className="text-sm font-semibold text-foreground mt-1.5">{alerta.titulo}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{alerta.descripcion}</p>

        <div className="flex items-center justify-between mt-3">
          <div>
            {alerta.campaigns && (
              <p className="text-xs font-medium text-foreground">{alerta.campaigns.nombre}</p>
            )}
            <p className="text-xs text-muted-foreground">{tiempoRelativo(alerta.created_at)}</p>
          </div>
          {!alerta.revisada && (
            <button
              onClick={marcarRevisada}
              disabled={marcando}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-background transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {marcando ? 'Marcando…' : 'Marcar revisada'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
