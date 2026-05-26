'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle2, Filter, Bell, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import TarjetaAlerta, { type Anomalia } from './TarjetaAlerta'

type FiltroSeveridad = 'todas' | 'critica' | 'alta' | 'media' | 'baja'
type FiltroEstado = 'todas' | 'activa' | 'revisada'

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
      setAlertas(json.exito ? (json.datos ?? []) : [])
    } catch {
      setAlertas([])
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
        {!cargando && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            {alertasFiltradas.length} de {alertas.length} alertas
          </div>
        )}
      </div>

      {cargando ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="bg-card border border-border rounded-xl p-5 h-28 animate-pulse" />)}
        </div>
      ) : alertasFiltradas.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground">
            {alertas.length === 0 ? 'El agente está monitoreando tus campañas' : 'Todo bajo control'}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {alertas.length === 0
              ? 'No se han detectado anomalías. Las alertas aparecerán aquí cuando el agente identifique problemas.'
              : 'No hay alertas con los filtros seleccionados'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertasFiltradas.map(a => <TarjetaAlerta key={a.id} alerta={a} onRevisada={handleRevisada} />)}
        </div>
      )}
    </div>
  )
}
