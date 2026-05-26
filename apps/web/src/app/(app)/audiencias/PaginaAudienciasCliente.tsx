'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Search, TrendingUp, RefreshCw, ExternalLink, Loader2 } from 'lucide-react'
import { cn, formatearNumero } from '@/lib/utils'
import SinConexionMeta from '@/components/SinConexionMeta'

interface Audiencia {
  id: string
  name: string
  subtype: string
  approximate_count: number
  time_updated: number
  description?: string
}

type FiltroTipo = 'todas' | 'CUSTOM' | 'LOOKALIKE' | 'SAVED_AUDIENCE' | 'ENGAGEMENT'

function mapearTipo(subtype: string): { label: string; color: string; bg: string } {
  switch (subtype) {
    case 'CUSTOM':
    case 'WEBSITE':
    case 'OFFLINE_CONVERSION':
    case 'CLAIM':
      return { label: 'Personalizada', color: 'text-indigo-400', bg: 'bg-indigo-400/10 border-indigo-400/20' }
    case 'LOOKALIKE':
      return { label: 'Lookalike', color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20' }
    case 'SAVED_AUDIENCE':
      return { label: 'Guardada', color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20' }
    case 'ENGAGEMENT':
      return { label: 'Engagement', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' }
    default:
      return { label: subtype, color: 'text-muted-foreground', bg: 'bg-muted/20 border-border' }
  }
}

function tiempoActualizacion(unixTs: number): string {
  const diff = Date.now() - unixTs * 1000
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'Hace menos de 1 hora'
  if (h < 24) return `Hace ${h}h`
  const d = Math.floor(h / 24)
  return `Hace ${d}d`
}

export default function PaginaAudienciasCliente() {
  const [audiencias, setAudiencias] = useState<Audiencia[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [sinConexion, setSinConexion] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todas')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const res = await fetch('/api/audiencias')
      const json = await res.json()

      if (json.sinConexion) {
        setSinConexion(true)
      } else if (json.exito) {
        setAudiencias(json.datos ?? [])
      } else {
        setError(json.error ?? 'Error al cargar audiencias')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  if (!cargando && sinConexion) return <SinConexionMeta />

  const filtradas = audiencias.filter(a => {
    const coincideBusqueda = a.name.toLowerCase().includes(busqueda.toLowerCase())
    const coincideTipo = filtroTipo === 'todas' ||
      (filtroTipo === 'CUSTOM' && ['CUSTOM', 'WEBSITE', 'OFFLINE_CONVERSION', 'CLAIM'].includes(a.subtype)) ||
      a.subtype === filtroTipo
    return coincideBusqueda && coincideTipo
  })

  const totalAlcance = audiencias.filter(a => a.approximate_count > 0).reduce((acc, a) => acc + a.approximate_count, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audiencias</h1>
          <p className="text-muted-foreground text-sm mt-1">Segmentos de audiencia de tu cuenta Meta Ads</p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="flex items-center gap-2 px-3 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <a href="https://adsmanager.facebook.com/adsmanager/audiences" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink className="w-4 h-4" />Ver en Meta
          </a>
        </div>
      </div>

      {!cargando && audiencias.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total audiencias', valor: audiencias.length.toString(), icono: Users },
            { label: 'Personalizadas', valor: audiencias.filter(a => ['CUSTOM', 'WEBSITE', 'OFFLINE_CONVERSION', 'CLAIM'].includes(a.subtype)).length.toString(), icono: Users },
            { label: 'Lookalikes', valor: audiencias.filter(a => a.subtype === 'LOOKALIKE').length.toString(), icono: TrendingUp },
            { label: 'Alcance total', valor: totalAlcance > 0 ? formatearNumero(totalAlcance) : '—', icono: RefreshCw },
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
      )}

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
          {(['todas', 'CUSTOM', 'LOOKALIKE', 'SAVED_AUDIENCE', 'ENGAGEMENT'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filtroTipo === t ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'todas' ? 'Todas'
                : t === 'CUSTOM' ? 'Personalizadas'
                : t === 'LOOKALIKE' ? 'Lookalike'
                : t === 'SAVED_AUDIENCE' ? 'Guardadas'
                : 'Engagement'}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Cargando audiencias desde Meta Ads…</p>
        </div>
      ) : error ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <p className="text-destructive text-sm">{error}</p>
          <button onClick={cargar} className="mt-4 text-xs text-primary hover:underline">Reintentar</button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Audiencia</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tamaño</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actualización</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtradas.map(a => {
                  const cfg = mapearTipo(a.subtype)
                  return (
                    <tr key={a.id} className="hover:bg-background/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">{a.name}</p>
                        {a.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">{a.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', cfg.bg, cfg.color)}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-mono text-sm text-foreground">
                          {a.approximate_count > 0 ? formatearNumero(a.approximate_count) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-xs text-muted-foreground">
                        {a.time_updated ? tiempoActualizacion(a.time_updated) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtradas.length === 0 && !cargando && (
            <div className="p-16 text-center">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                {audiencias.length === 0
                  ? 'No se encontraron audiencias en tu cuenta de Meta Ads'
                  : 'No se encontraron audiencias con los filtros seleccionados'}
              </p>
            </div>
          )}
        </div>
      )}

      {!cargando && audiencias.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {audiencias.length} audiencias obtenidas directamente desde Meta Ads API
        </p>
      )}
    </div>
  )
}
