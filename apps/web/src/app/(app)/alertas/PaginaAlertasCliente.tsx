'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle2, Filter, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import TarjetaAlerta, { type Anomalia } from './TarjetaAlerta'

type FiltroSeveridad = 'todas' | 'critica' | 'alta' | 'media' | 'baja'
type FiltroEstado = 'todas' | 'activa' | 'revisada'

const DEMO_ALERTAS: Anomalia[] = [
  { id: 'a1', tipo: 'roas_bajo', titulo: 'ROAS cayó -32% en las últimas 24h', descripcion: 'El ROAS de "Prospección - Lookalike 2%" bajó de 4,8x a 3,2x (promedio 7d). Posible fatiga de audiencia.', severidad_score: 75, activa: true, revisada: false, created_at: new Date(Date.now() - 2 * 3_600_000).toISOString(), campaigns: { nombre: 'Prospección - Lookalike 2%', tipo_campaña: 'Prospección' } },
  { id: 'a2', tipo: 'cpc_alto', titulo: 'CPC aumentó +28% vs promedio de 7 días', descripcion: 'El costo por click de "Remarketing - Visitantes 30d" subió de $0,85 a $1,09. Alta competencia en la subasta.', severidad_score: 55, activa: true, revisada: false, created_at: new Date(Date.now() - 5 * 3_600_000).toISOString(), campaigns: { nombre: 'Remarketing - Visitantes 30d', tipo_campaña: 'Remarketing' } },
  { id: 'a3', tipo: 'frecuencia_alta', titulo: 'Frecuencia crítica: 7,2x promedio 7 días', descripcion: 'La audiencia de "Retargeting - Carrito" ha visto los anuncios 7,2 veces. Riesgo crítico de fatiga.', severidad_score: 90, activa: true, revisada: false, created_at: new Date(Date.now() - 1 * 3_600_000).toISOString(), campaigns: { nombre: 'Retargeting - Carrito Abandonado', tipo_campaña: 'Retargeting' } },
  { id: 'a4', tipo: 'presupuesto_agotado', titulo: 'Presupuesto casi agotado: 97% consumido', descripcion: '"Prospección - Intereses Fitness" ha consumido el 97% del presupuesto diario. Los anuncios podrían dejar de entregarse.', severidad_score: 60, activa: true, revisada: false, created_at: new Date(Date.now() - 30 * 60_000).toISOString(), campaigns: { nombre: 'Prospección - Intereses Fitness', tipo_campaña: 'Prospección' } },
  { id: 'a5', tipo: 'caida_conversiones', titulo: 'Conversiones cayeron -38% esta semana', descripcion: 'Las conversiones de "Conversión - DABA Catálogo" bajaron significativamente. Revisar calidad del tráfico.', severidad_score: 75, activa: false, revisada: true, created_at: new Date(Date.now() - 24 * 3_600_000).toISOString(), campaigns: { nombre: 'Conversión - DABA Catálogo', tipo_campaña: 'Conversión' } },
]

export default function PaginaAlertasCliente() {
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
