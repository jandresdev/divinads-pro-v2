'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle, TrendingDown, TrendingUp, Zap, DollarSign,
  RefreshCw, CheckCircle2, Filter, Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Anomalia {
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

type FiltroSeveridad = 'todas' | 'critica' | 'alta' | 'media' | 'baja'
type FiltroEstado = 'todas' | 'activa' | 'revisada'

function nivelSeveridad(score: number) {
  if (score >= 85) return { label: 'Crítica', color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20' }
  if (score >= 70) return { label: 'Alta',    color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' }
  if (score >= 50) return { label: 'Media',   color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' }
  return               { label: 'Baja',    color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20' }
}

function iconoTipo(tipo: string) {
  if (tipo.includes('roas') || tipo.includes('conversiones')) return TrendingDown
  if (tipo.includes('cpc') || tipo.includes('cpa')) return TrendingUp
  if (tipo.includes('presupuesto')) return DollarSign
  if (tipo.includes('frecuencia')) return Zap
  return AlertTriangle
}

function tiempoRelativo(fechaISO: string): string {
  const diff = Date.now() - new Date(fechaISO).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

const DEMO_ALERTAS: Anomalia[] = [
  { id: 'a1', tipo: 'roas_bajo', titulo: 'ROAS cayó -32% en las últimas 24h', descripcion: 'El ROAS de "Prospección - Lookalike 2%" bajó de 4,8x a 3,2x (promedio 7d). Posible fatiga de audiencia.', severidad_score: 75, activa: true, revisada: false, created_at: new Date(Date.now() - 2 * 3_600_000).toISOString(), campaigns: { nombre: 'Prospección - Lookalike 2%', tipo_campaña: 'Prospección' } },
  { id: 'a2', tipo: 'cpc_alto', titulo: 'CPC aumentó +28% vs promedio de 7 días', descripcion: 'El costo por click de "Remarketing - Visitantes 30d" subió de $0,85 a $1,09. Alta competencia en la subasta.', severidad_score: 55, activa: true, revisada: false, created_at: new Date(Date.now() - 5 * 3_600_000).toISOString(), campaigns: { nombre: 'Remarketing - Visitantes 30d', tipo_campaña: 'Remarketing' } },
  { id: 'a3', tipo: 'frecuencia_alta', titulo: 'Frecuencia crítica: 7,2x promedio 7 días', descripcion: 'La audiencia de "Retargeting - Carrito" ha visto los anuncios 7,2 veces. Riesgo crítico de fatiga.', severidad_score: 90, activa: true, revisada: false, created_at: new Date(Date.now() - 1 * 3_600_000).toISOString(), campaigns: { nombre: 'Retargeting - Carrito Abandonado', tipo_campaña: 'Retargeting' } },
  { id: 'a4', tipo: 'presupuesto_agotado', titulo: 'Presupuesto casi agotado: 97% consumido', descripcion: '"Prospección - Intereses Fitness" ha consumido el 97% del presupuesto diario. Los anuncios podrían dejar de entregarse.', severidad_score: 60, activa: true, revisada: false, created_at: new Date(Date.now() - 30 * 60_000).toISOString(), campaigns: { nombre: 'Prospección - Intereses Fitness', tipo_campaña: 'Prospección' } },
  { id: 'a5', tipo: 'caida_conversiones', titulo: 'Conversiones cayeron -38% esta semana', descripcion: 'Las conversiones de "Conversión - DABA Catálogo" bajaron significativamente. Revisar calidad del tráfico.', severidad_score: 75, activa: false, revisada: true, created_at: new Date(Date.now() - 24 * 3_600_000).toISOString(), campaigns: { nombre: 'Conversión - DABA Catálogo', tipo_campaña: 'Conversión' } },
]

function TarjetaAlerta({ alerta, onRevisada }: { alerta: Anomalia; onRevisada: (id: string) => void }) {
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
      <div className={cn('p-2.5 rounded-xl border h-fit', nivel.bg)}>
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
            <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">Revisada</span>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground mt-1.5">{alerta.titulo}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{alerta.descripcion}</p>
        <div className="flex items-center justify-between mt-3">
          <div>
            {alerta.campaigns && <p className="text-xs font-medium text-foreground">{alerta.campaigns.nombre}</p>}
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

export default function PaginaAlertas() {
  const [alertas, setAlertas] = useState<Anomalia[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroSeveridad, setFiltroSeveridad] = useState<FiltroSeveridad>('todas')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('activa')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/anomalias')
      const json = await res.json()
      setAlertas(json.exito && json.datos?.length > 0 ? json.datos : DEMO_ALERTAS)
    } catch {
      setAlertas(DEMO_ALERTAS)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function handleRevisada(id: string) {
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, revisada: true } : a))
  }

  const alertasFiltradas = alertas.filter(a => {
    const s = a.severidad_score
    const pasaSev =
      filtroSeveridad === 'todas' ||
      (filtroSeveridad === 'critica' && s >= 85) ||
      (filtroSeveridad === 'alta' && s >= 70 && s < 85) ||
      (filtroSeveridad === 'media' && s >= 50 && s < 70) ||
      (filtroSeveridad === 'baja' && s < 50)
    const pasaEst =
      filtroEstado === 'todas' ||
      (filtroEstado === 'activa' && !a.revisada) ||
      (filtroEstado === 'revisada' && a.revisada)
    return pasaSev && pasaEst
  })

  const contadores = {
    critica: alertas.filter(a => a.severidad_score >= 85 && !a.revisada).length,
    alta:    alertas.filter(a => a.severidad_score >= 70 && a.severidad_score < 85 && !a.revisada).length,
    media:   alertas.filter(a => a.severidad_score >= 50 && a.severidad_score < 70 && !a.revisada).length,
    baja:    alertas.filter(a => a.severidad_score < 50 && !a.revisada).length,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alertas</h1>
          <p className="text-muted-foreground text-sm mt-1">Anomalías detectadas por el agente IA en tiempo real</p>
        </div>
        <button onClick={cargar} className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="w-4 h-4" />Actualizar
        </button>
      </div>

      {/* Resumen por severidad */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: 'critica' as FiltroSeveridad, label: 'Críticas', count: contadores.critica, color: 'text-red-400',    bg: 'bg-red-400/5 border-red-400/20' },
          { key: 'alta'    as FiltroSeveridad, label: 'Altas',    count: contadores.alta,    color: 'text-orange-400', bg: 'bg-orange-400/5 border-orange-400/20' },
          { key: 'media'   as FiltroSeveridad, label: 'Medias',   count: contadores.media,   color: 'text-yellow-400', bg: 'bg-yellow-400/5 border-yellow-400/20' },
          { key: 'baja'    as FiltroSeveridad, label: 'Bajas',    count: contadores.baja,    color: 'text-blue-400',   bg: 'bg-blue-400/5 border-blue-400/20' },
        ].map(({ key, label, count, color, bg }) => (
          <button
            key={key}
            onClick={() => setFiltroSeveridad(filtroSeveridad === key ? 'todas' : key)}
            className={cn('border rounded-xl p-4 text-left transition-all', filtroSeveridad === key ? bg : 'bg-card border-border hover:border-border/80')}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Bell className={cn('w-4 h-4', color)} />
            </div>
            <p className={cn('text-2xl font-bold', color)}>{count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">sin revisar</p>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl" role="group">
          {(['todas', 'activa', 'revisada'] as FiltroEstado[]).map(f => (
            <button
              key={f}
              onClick={() => setFiltroEstado(f)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', filtroEstado === f ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
            >
              {f === 'todas' ? 'Todas' : f === 'activa' ? 'Sin revisar' : 'Revisadas'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
          {alertasFiltradas.length} de {alertas.length} alertas
        </div>
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="bg-card border border-border rounded-xl p-5 h-28 animate-pulse" />)}
        </div>
      ) : alertasFiltradas.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground">Todo bajo control</h2>
          <p className="text-muted-foreground text-sm mt-1">No hay alertas con los filtros seleccionados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertasFiltradas.map(a => <TarjetaAlerta key={a.id} alerta={a} onRevisada={handleRevisada} />)}
        </div>
      )}
    </div>
  )
}
