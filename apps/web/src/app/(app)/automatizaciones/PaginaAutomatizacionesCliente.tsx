'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bot, CheckCircle2, Clock, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import TarjetaAccion, { type AccionAgente } from './TarjetaAccion'

export default function PaginaAutomatizacionesCliente() {
  const [acciones, setAcciones] = useState<AccionAgente[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('todas')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/agente/acciones')
      const json = await res.json()
      setAcciones(json.exito ? (json.datos ?? []) : [])
    } catch {
      setAcciones([])
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function handleAprobar(id: string) {
    setAcciones(prev => prev.map(a => a.id === id ? { ...a, estado: 'completado', aprobado_por: 'usuario' } : a))
  }

  const accionesFiltradas = filtroEstado === 'todas'
    ? acciones
    : acciones.filter(a => a.estado === filtroEstado)

  const pendientes = acciones.filter(a => a.estado === 'pendiente').length
  const completadas = acciones.filter(a => a.estado === 'completado').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automatizaciones</h1>
          <p className="text-muted-foreground text-sm mt-1">Decisiones y acciones autónomas del agente IA</p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-4 h-4" />Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-400" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pendientes de aprobación</p>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{pendientes}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Ejecutadas exitosamente</p>
          </div>
          <p className="text-2xl font-bold text-success">{completadas}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Modo agente</p>
          </div>
          <p className="text-sm font-semibold text-foreground">Autónomo 24/7</p>
          <p className="text-xs text-success">Activo</p>
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl w-fit" role="group">
        {[
          { valor: 'todas', label: 'Todas' },
          { valor: 'pendiente', label: 'Pendientes' },
          { valor: 'completado', label: 'Completadas' },
          { valor: 'rechazado', label: 'Rechazadas' },
        ].map(f => (
          <button
            key={f.valor}
            onClick={() => setFiltroEstado(f.valor)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filtroEstado === f.valor ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
            {f.valor === 'pendiente' && pendientes > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 text-[10px] font-bold">
                {pendientes}
              </span>
            )}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : accionesFiltradas.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <Bot className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground">
            {acciones.length === 0 ? 'El agente está analizando tus campañas' : 'Sin acciones'}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {acciones.length === 0
              ? 'Las acciones automáticas aparecerán aquí cuando el agente detecte oportunidades de optimización.'
              : 'No hay acciones con el filtro seleccionado'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {accionesFiltradas.map(a => (
            <TarjetaAccion key={a.id} accion={a} onAprobar={handleAprobar} />
          ))}
        </div>
      )}
    </div>
  )
}
