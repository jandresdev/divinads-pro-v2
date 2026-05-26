'use client'

import { useState } from 'react'
import { Users, Search, TrendingUp, RefreshCw, ExternalLink } from 'lucide-react'
import { cn, formatearNumero } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoAudiencia = 'custom' | 'lookalike' | 'saved' | 'advantage'

interface Audiencia {
  id: string
  nombre: string
  tipo: TipoAudiencia
  tamaño: number
  descripcion: string
  campañasActivas: number
  actualizacion: string
}

// ─── Datos demo ───────────────────────────────────────────────────────────────

const DEMO_AUDIENCIAS: Audiencia[] = [
  {
    id: 'a1',
    nombre: 'Compradores últimos 180 días',
    tipo: 'custom',
    tamaño: 45_000,
    descripcion: 'Personas que realizaron una compra en los últimos 180 días vía Pixel.',
    campañasActivas: 3,
    actualizacion: 'Hace 2 horas',
  },
  {
    id: 'a2',
    nombre: 'Visitantes del sitio 30 días',
    tipo: 'custom',
    tamaño: 128_000,
    descripcion: 'Todos los visitantes del sitio web en los últimos 30 días.',
    campañasActivas: 2,
    actualizacion: 'Hace 1 hora',
  },
  {
    id: 'a3',
    nombre: 'Lookalike Compradores 1%',
    tipo: 'lookalike',
    tamaño: 1_200_000,
    descripcion: 'Similar al 1% superior de compradores. Alta intención de compra.',
    campañasActivas: 2,
    actualizacion: 'Hace 3 días',
  },
  {
    id: 'a4',
    nombre: 'Lookalike Visitantes 2%',
    tipo: 'lookalike',
    tamaño: 2_400_000,
    descripcion: 'Similar al 2% de visitantes del sitio. Audiencia de prospección amplia.',
    campañasActivas: 1,
    actualizacion: 'Hace 3 días',
  },
  {
    id: 'a5',
    nombre: 'Intereses Fitness & Wellness',
    tipo: 'saved',
    tamaño: 3_800_000,
    descripcion: 'Personas interesadas en fitness, bienestar y vida saludable. 25-45 años.',
    campañasActivas: 1,
    actualizacion: 'Hace 5 días',
  },
  {
    id: 'a6',
    nombre: 'Advantage+ Shopping',
    tipo: 'advantage',
    tamaño: 0,
    descripcion: 'Audiencia gestionada automáticamente por Meta para optimizar conversiones.',
    campañasActivas: 1,
    actualizacion: 'Actualización continua',
  },
  {
    id: 'a7',
    nombre: 'Carrito abandonado 7 días',
    tipo: 'custom',
    tamaño: 8_200,
    descripcion: 'Personas que agregaron al carrito pero no completaron la compra (7 días).',
    campañasActivas: 1,
    actualizacion: 'Hace 30 min',
  },
  {
    id: 'a8',
    nombre: 'Seguidores de Instagram',
    tipo: 'custom',
    tamaño: 22_500,
    descripcion: 'Personas que siguen la cuenta de Instagram del negocio.',
    campañasActivas: 0,
    actualizacion: 'Hace 1 día',
  },
]

const CONFIG_TIPO: Record<TipoAudiencia, { label: string; color: string; bg: string }> = {
  custom:    { label: 'Personalizada',  color: 'text-indigo-400',  bg: 'bg-indigo-400/10 border-indigo-400/20' },
  lookalike: { label: 'Lookalike',      color: 'text-violet-400',  bg: 'bg-violet-400/10 border-violet-400/20' },
  saved:     { label: 'Guardada',       color: 'text-cyan-400',    bg: 'bg-cyan-400/10 border-cyan-400/20' },
  advantage: { label: 'Advantage+',     color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PaginaAudiencias() {
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoAudiencia | 'todas'>('todas')

  const audienciasFiltradas = DEMO_AUDIENCIAS.filter(a => {
    const coincideBusqueda = a.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const coincideTipo = filtroTipo === 'todas' || a.tipo === filtroTipo
    return coincideBusqueda && coincideTipo
  })

  const totalAlcance = DEMO_AUDIENCIAS.filter(a => a.tamaño > 0).reduce((acc, a) => acc + a.tamaño, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audiencias</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Segmentos de audiencia de tu cuenta Meta Ads
          </p>
        </div>
        <a
          href="https://adsmanager.facebook.com/adsmanager/audiences"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Ver en Meta
        </a>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total audiencias', valor: DEMO_AUDIENCIAS.length.toString(), icono: Users },
          { label: 'Personalizadas', valor: DEMO_AUDIENCIAS.filter(a => a.tipo === 'custom').length.toString(), icono: Users },
          { label: 'Lookalikes', valor: DEMO_AUDIENCIAS.filter(a => a.tipo === 'lookalike').length.toString(), icono: TrendingUp },
          { label: 'Alcance total', valor: formatearNumero(totalAlcance), icono: RefreshCw },
        ].map((s, i) => {
          const Icono = s.icono
          return (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icono className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
              </div>
              <p className="text-xl font-bold text-foreground">{s.valor}</p>
            </div>
          )
        })}
      </div>

      {/* Búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar audiencia por nombre…"
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl" role="group">
          {(['todas', 'custom', 'lookalike', 'saved', 'advantage'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filtroTipo === t ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'todas' ? 'Todas' : CONFIG_TIPO[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de audiencias */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Audiencia</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tamaño</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Campañas</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actualización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {audienciasFiltradas.map(a => {
                const cfg = CONFIG_TIPO[a.tipo]
                return (
                  <tr key={a.id} className="hover:bg-background/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-foreground">{a.nombre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">{a.descripcion}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-mono text-sm text-foreground">
                        {a.tamaño > 0 ? formatearNumero(a.tamaño) : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={cn(
                        'text-sm font-medium',
                        a.campañasActivas > 0 ? 'text-success' : 'text-muted-foreground'
                      )}>
                        {a.campañasActivas}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-xs text-muted-foreground">
                      {a.actualizacion}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {audienciasFiltradas.length === 0 && (
          <div className="p-16 text-center">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No se encontraron audiencias</p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Los datos de audiencias se sincronizan con tu cuenta Meta Ads cada 24 horas.
      </p>
    </div>
  )
}
