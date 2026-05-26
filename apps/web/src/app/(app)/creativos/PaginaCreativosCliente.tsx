'use client'

import { useState } from 'react'
import { Image, Search, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import TarjetaCreativo, {
  type Creativo, type FormatoCreativo, type EstadoCreativo,
  CONFIG_FORMATO, formatearNumeroK,
} from './TarjetaCreativo'

const DEMO_CREATIVOS: Creativo[] = [
  { id: 'c1', nombre: 'Banner Oferta 50% OFF - Verano', formato: 'imagen', estado: 'activo', campañas: ['Remarketing - Visitantes 30d', 'Retargeting - Carrito'], ctr: 4.8, impresiones: 145_000, clics: 6_960, miniatura: '/placeholder-imagen.jpg', fechaCreacion: '2026-04-15' },
  { id: 'c2', nombre: 'Video Historia de Marca 15s', formato: 'video', estado: 'activo', campañas: ['Prospección - Lookalike 2%'], ctr: 2.1, impresiones: 280_000, clics: 5_880, miniatura: '/placeholder-video.jpg', fechaCreacion: '2026-04-10' },
  { id: 'c3', nombre: 'Carrusel Productos Destacados', formato: 'carrusel', estado: 'activo', campañas: ['Conversión - DABA Catálogo'], ctr: 6.3, impresiones: 92_000, clics: 5_796, miniatura: '/placeholder-carousel.jpg', fechaCreacion: '2026-03-28' },
  { id: 'c4', nombre: 'Colección Premium Fitness', formato: 'coleccion', estado: 'activo', campañas: ['Prospección - Intereses Fitness'], ctr: 3.4, impresiones: 67_000, clics: 2_278, miniatura: '/placeholder-collection.jpg', fechaCreacion: '2026-03-20' },
  { id: 'c5', nombre: 'Banner Verano 2025 (legacy)', formato: 'imagen', estado: 'pausado', campañas: [], ctr: 1.2, impresiones: 34_000, clics: 408, miniatura: '/placeholder-imagen.jpg', fechaCreacion: '2025-11-01' },
  { id: 'c6', nombre: 'Video Testimonios Clientes 30s', formato: 'video', estado: 'activo', campañas: ['Remarketing - Compradores 90d'], ctr: 5.7, impresiones: 41_000, clics: 2_337, miniatura: '/placeholder-video.jpg', fechaCreacion: '2026-05-01' },
]

export default function PaginaCreativosCliente() {
  const [busqueda, setBusqueda] = useState('')
  const [filtroFormato, setFiltroFormato] = useState<FormatoCreativo | 'todos'>('todos')
  const [filtroEstado, setFiltroEstado] = useState<EstadoCreativo | 'todos'>('todos')

  const creativosFiltrados = DEMO_CREATIVOS.filter(c => {
    const coincideBusqueda = c.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const coincideFormato = filtroFormato === 'todos' || c.formato === filtroFormato
    const coincideEstado = filtroEstado === 'todos' || c.estado === filtroEstado
    return coincideBusqueda && coincideFormato && coincideEstado
  })

  const topCTR = [...DEMO_CREATIVOS].filter(c => c.estado === 'activo').sort((a, b) => b.ctr - a.ctr)[0]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Creativos</h1>
          <p className="text-muted-foreground text-sm mt-1">Anuncios y assets visuales de tus campañas</p>
        </div>
        <a
          href="https://adsmanager.facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-4 h-4" />Administrar en Meta
        </a>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total creativos',     valor: DEMO_CREATIVOS.length.toString() },
          { label: 'Activos',             valor: DEMO_CREATIVOS.filter(c => c.estado === 'activo').length.toString() },
          { label: 'CTR más alto',        valor: topCTR ? `${topCTR.ctr.toFixed(1).replace('.', ',')}%` : '—' },
          { label: 'Impresiones totales', valor: formatearNumeroK(DEMO_CREATIVOS.reduce((acc, c) => acc + c.impresiones, 0)) },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-xl font-bold text-foreground">{s.valor}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar creativo por nombre…"
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl" role="group">
          {(['todos', 'imagen', 'video', 'carrusel', 'coleccion'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltroFormato(f)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', filtroFormato === f ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
            >
              {f === 'todos' ? 'Todos' : CONFIG_FORMATO[f].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl" role="group">
          {(['todos', 'activo', 'pausado'] as const).map(e => (
            <button
              key={e}
              onClick={() => setFiltroEstado(e)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', filtroEstado === e ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
            >
              {e === 'todos' ? 'Todos' : e === 'activo' ? 'Activos' : 'Pausados'}
            </button>
          ))}
        </div>
      </div>

      {creativosFiltrados.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <Image className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No se encontraron creativos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {creativosFiltrados.map(c => (
            <TarjetaCreativo key={c.id} creativo={c} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Los creativos se sincronizan con tu cuenta Meta Ads cada 24 horas.
      </p>
    </div>
  )
}
