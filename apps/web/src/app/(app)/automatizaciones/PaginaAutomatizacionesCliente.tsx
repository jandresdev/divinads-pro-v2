'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bot, CheckCircle2, Clock, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import TarjetaAccion, { type AccionAgente } from './TarjetaAccion'

const DEMO_ACCIONES: AccionAgente[] = [
  {
    id: 'ac1', tipo_accion: 'pausar_campaña',
    descripcion: 'ROAS cayó 32% bajo el baseline de 7 días. Se detectó fatiga de audiencia severa. Se pausó la campaña para evitar pérdida de presupuesto adicional.',
    confianza: 91, estado: 'completado', aprobado_por: 'agente_autonomo',
    resultado: { exitoso: true, mensaje: 'Campaña pausada exitosamente en Meta Ads.' },
    campaign_id: '1',
    created_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    campaigns: { nombre: 'Prospección - Intereses Fitness' },
  },
  {
    id: 'ac2', tipo_accion: 'reducir_presupuesto',
    descripcion: 'CPC aumentó 28% sobre el promedio de 7 días. Se redujo el presupuesto diario del AdSet en 20% para controlar el costo.',
    confianza: 83, estado: 'completado', aprobado_por: 'agente_autonomo',
    resultado: { exitoso: true, presupuestoAnterior: 150, presupuestoNuevo: 120 },
    campaign_id: '2',
    created_at: new Date(Date.now() - 5 * 3_600_000).toISOString(),
    campaigns: { nombre: 'Remarketing - Visitantes 30d' },
  },
  {
    id: 'ac3', tipo_accion: 'solo_monitorear',
    descripcion: 'Frecuencia alta detectada (7,2x en 7 días). Se recomienda refrescar creatividades pero el impacto estimado es <$100, quedando en observación.',
    confianza: 76, estado: 'completado', aprobado_por: 'agente_autonomo',
    resultado: { exitoso: true, mensaje: 'Acción de solo monitoreo registrada.' },
    campaign_id: '3',
    created_at: new Date(Date.now() - 8 * 3_600_000).toISOString(),
    campaigns: { nombre: 'Retargeting - Carrito Abandonado' },
  },
  {
    id: 'ac4', tipo_accion: 'aumentar_presupuesto',
    descripcion: 'ROAS 8,4x supera el baseline histórico en 2x. Se propone aumentar presupuesto 30% para capitalizar el momento de alta performance.',
    confianza: 88, estado: 'pendiente', aprobado_por: null,
    resultado: null, campaign_id: '3',
    created_at: new Date(Date.now() - 30 * 60_000).toISOString(),
    campaigns: { nombre: 'Retargeting - Carrito Abandonado' },
  },
]

export default function PaginaAutomatizacionesCliente() {
  const [acciones, setAcciones] = useState<AccionAgente[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('todas')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/agente/acciones')
      const json = await res.json()
      setAcciones(json.exito && json.datos?.length > 0 ? json.datos : DEMO_ACCIONES)
    } catch {
      setAcciones(DEMO_ACCIONES)
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
          <h2 className="text-lg font-semibold text-foreground">Sin acciones</h2>
          <p className="text-muted-foreground text-sm mt-1">El agente no ha registrado acciones con este filtro</p>
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
