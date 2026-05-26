'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ExternalLink, TrendingUp, Eye, MousePointerClick, Loader2, Image, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import SinConexionMeta from '@/components/SinConexionMeta'

interface Creativo {
  id: string
  nombre: string
  estado: 'activo' | 'pausado'
  campañaNombre: string | null
  campañaObjetivo: string | null
  thumbnail: string | null
  titulo: string | null
  cuerpo: string | null
  impresiones: number
  clics: number
  ctr: number
  gasto: number
}

function formatearNumeroK(n: number): string {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(0)}K`
    : n.toString()
}

export default function PaginaCreativosCliente() {
  const [creativos, setCreativos] = useState<Creativo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [sinConexion, setSinConexion] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'pausado'>('todos')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const res = await fetch('/api/creativos')
      const json = await res.json()

      if (json.sinConexion) {
        setSinConexion(true)
      } else if (json.exito) {
        setCreativos(json.datos ?? [])
      } else {
        setError(json.error ?? 'Error al cargar creativos')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  if (!cargando && sinConexion) return <SinConexionMeta />

  const filtrados = creativos.filter(c => {
    const coincideBusqueda = c.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const coincideEstado = filtroEstado === 'todos' || c.estado === filtroEstado
    return coincideBusqueda && coincideEstado
  })

  const topCTR = [...creativos].filter(c => c.estado === 'activo').sort((a, b) => b.ctr - a.ctr)[0]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Creativos</h1>
          <p className="text-muted-foreground text-sm mt-1">Anuncios activos y pausados de tu cuenta Meta Ads</p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="p-2.5 border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink className="w-4 h-4" />Administrar en Meta
          </a>
        </div>
      </div>

      {!cargando && creativos.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total anuncios',      valor: creativos.length.toString() },
            { label: 'Activos',             valor: creativos.filter(c => c.estado === 'activo').length.toString() },
            { label: 'CTR más alto',        valor: topCTR ? `${topCTR.ctr.toFixed(1).replace('.', ',')}%` : '—' },
            { label: 'Impresiones totales', valor: formatearNumeroK(creativos.reduce((acc, c) => acc + c.impresiones, 0)) },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-xl font-bold text-foreground">{s.valor}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre de anuncio…"
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl" role="group">
          {(['todos', 'activo', 'pausado'] as const).map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filtroEstado === e ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}>
              {e === 'todos' ? 'Todos' : e === 'activo' ? 'Activos' : 'Pausados'}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Cargando anuncios desde Meta Ads…</p>
        </div>
      ) : error ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <p className="text-destructive text-sm">{error}</p>
          <button onClick={cargar} className="mt-4 text-xs text-primary hover:underline">Reintentar</button>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <Image className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {creativos.length === 0
              ? 'No se encontraron anuncios activos o pausados en tu cuenta'
              : 'No se encontraron anuncios con los filtros seleccionados'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-border/80 transition-colors">
              {/* Miniatura / placeholder */}
              <div className="relative h-40 bg-muted/20 flex items-center justify-center overflow-hidden">
                {c.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumbnail} alt={c.nombre} className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-12 h-12 opacity-20 text-muted-foreground" />
                )}
                <div className="absolute top-3 left-3">
                  <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-border">
                    <span className={cn('w-1.5 h-1.5 rounded-full', c.estado === 'activo' ? 'bg-success' : 'bg-yellow-400')} />
                    <span className={c.estado === 'activo' ? 'text-success' : 'text-yellow-400'}>
                      {c.estado === 'activo' ? 'Activo' : 'Pausado'}
                    </span>
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground truncate">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {c.campañaNombre ?? 'Sin campaña asignada'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <Eye className="w-3 h-3 text-muted-foreground mx-auto mb-0.5" />
                    <p className="text-sm font-bold text-foreground">{formatearNumeroK(c.impresiones)}</p>
                    <p className="text-[10px] text-muted-foreground">Impresiones</p>
                  </div>
                  <div className="text-center">
                    <MousePointerClick className="w-3 h-3 text-muted-foreground mx-auto mb-0.5" />
                    <p className="text-sm font-bold text-foreground">{formatearNumeroK(c.clics)}</p>
                    <p className="text-[10px] text-muted-foreground">Clics</p>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="w-3 h-3 text-muted-foreground mx-auto mb-0.5" />
                    <p className={cn('text-sm font-bold',
                      c.ctr >= 4 ? 'text-success' : c.ctr >= 2 ? 'text-yellow-400' : c.ctr > 0 ? 'text-red-400' : 'text-muted-foreground'
                    )}>
                      {c.ctr > 0 ? `${c.ctr.toFixed(1).replace('.', ',')}%` : '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">CTR</p>
                  </div>
                </div>

                <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg py-2 transition-colors w-full">
                  <ExternalLink className="w-3.5 h-3.5" />Ver en Meta
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {!cargando && creativos.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {creativos.length} anuncios obtenidos desde Meta Ads API · datos de los últimos 30 días
        </p>
      )}
    </div>
  )
}
