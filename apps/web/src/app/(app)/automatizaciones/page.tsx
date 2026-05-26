'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bot,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingDown,
  TrendingUp,
  Pause,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react'
import { cn, formatearMoneda } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AccionAgente {
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function configAccion(tipo: string): { label: string; icono: React.ComponentType<{ className?: string }>; color: string } {
  switch (tipo) {
    case 'pausar_campaña':       return { label: 'Pausar campaña',       icono: Pause,        color: 'text-red-400' }
    case 'reducir_presupuesto':  return { label: 'Reducir presupuesto',  icono: TrendingDown,  color: 'text-orange-400' }
    case 'aumentar_presupuesto': return { label: 'Aumentar presupuesto', icono: TrendingUp,    color: 'text-green-400' }
    case 'solo_monitorear':      return { label: 'Solo monitorear',      icono: Eye,           color: 'text-blue-400' }
    default:                     return { label: tipo,                   icono: Zap,           color: 'text-muted-foreground' }
  }
}

function configEstado(estado: string): { label: string; color: string; bg: string; Icono: React.ComponentType<{ className?: string }> } {
  switch (estado) {
    case 'completado': return { label: 'Completado', color: 'text-success',   bg: 'bg-success/10 border-success/20',      Icono: CheckCircle2 }
    case 'pendiente':  return { label: 'Pendiente',  color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', Icono: Clock }
    case 'rechazado':  return { label: 'Rechazado',  color: 'text-red-400',   bg: 'bg-red-400/10 border-red-400/20',       Icono: XCircle }
    default:           return { label: estado,       color: 'text-muted-foreground', bg: 'bg-muted/20 border-border',      Icono: Clock }
  }
}

function tiempoRelativo(fechaISO: string): string {
  const diff = Date.now() - new Date(fechaISO).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

// ─── Datos demo ───────────────────────────────────────────────────────────────

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

// ─── Tarjeta de acción ────────────────────────────────────────────────────────

function TarjetaAccion({ accion, onAprobar }: { accion: AccionAgente; onAprobar: (id: string) => void }) {
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
            <div className="flex gap-2">
              <button
                onClick={aprobar}
                disabled={aprobando}
                className="flex items-center gap-1.5 text-xs font-medium bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {aprobando ? 'Ejecutando…' : 'Aprobar y ejecutar'}
              </button>
            </div>
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

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PaginaAutomatizaciones() {
  const [acciones, setAcciones] = useState<AccionAgente[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('todas')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/agente/acciones')
      const json = await res.json()
      if (json.exito && json.datos?.length > 0) {
        setAcciones(json.datos)
      } else {
        setAcciones(DEMO_ACCIONES)
      }
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
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automatizaciones</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Decisiones y acciones autónomas del agente IA
          </p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Resumen */}
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

      {/* Filtros */}
      <div
        className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl w-fit"
        role="group"
        aria-label="Filtrar por estado"
      >
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

      {/* Lista */}
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
