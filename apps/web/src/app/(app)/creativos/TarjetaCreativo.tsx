'use client'

import { Image, Video, FileText, ExternalLink, TrendingUp, Eye, MousePointerClick } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FormatoCreativo = 'imagen' | 'video' | 'carrusel' | 'coleccion'
export type EstadoCreativo = 'activo' | 'pausado' | 'archivado'

export interface Creativo {
  id: string
  nombre: string
  formato: FormatoCreativo
  estado: EstadoCreativo
  campañas: string[]
  ctr: number
  impresiones: number
  clics: number
  miniatura: string
  fechaCreacion: string
}

export const CONFIG_FORMATO: Record<FormatoCreativo, { label: string; Icono: React.ComponentType<{ className?: string }>; color: string }> = {
  imagen:    { label: 'Imagen',    Icono: Image,    color: 'text-blue-400' },
  video:     { label: 'Video',     Icono: Video,    color: 'text-purple-400' },
  carrusel:  { label: 'Carrusel',  Icono: Image,    color: 'text-cyan-400' },
  coleccion: { label: 'Colección', Icono: FileText, color: 'text-emerald-400' },
}

export const CONFIG_ESTADO: Record<EstadoCreativo, { label: string; color: string; dot: string }> = {
  activo:    { label: 'Activo',    color: 'text-success',         dot: 'bg-success' },
  pausado:   { label: 'Pausado',   color: 'text-yellow-400',      dot: 'bg-yellow-400' },
  archivado: { label: 'Archivado', color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
}

export function formatearNumeroK(n: number): string {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(0)}K`
    : n.toString()
}

export default function TarjetaCreativo({ creativo }: { creativo: Creativo }) {
  const fmt = CONFIG_FORMATO[creativo.formato]
  const est = CONFIG_ESTADO[creativo.estado]
  const FmtIcono = fmt.Icono

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-border/80 transition-colors group">
      <div className="relative h-40 bg-muted/20 flex items-center justify-center">
        <FmtIcono className={cn('w-12 h-12 opacity-20', fmt.color)} />
        <div className="absolute top-3 left-3">
          <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-border">
            <span className={cn('w-1.5 h-1.5 rounded-full', est.dot)} />
            <span className={est.color}>{est.label}</span>
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className={cn('text-xs font-medium px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-border', fmt.color)}>
            {fmt.label}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground truncate">{creativo.nombre}</p>
          {creativo.campañas.length > 0 ? (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {creativo.campañas[0]}{creativo.campañas.length > 1 ? ` +${creativo.campañas.length - 1}` : ''}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Sin campañas activas</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Eye className="w-3 h-3" />
            </div>
            <p className="text-sm font-bold text-foreground">{formatearNumeroK(creativo.impresiones)}</p>
            <p className="text-[10px] text-muted-foreground">Impresiones</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <MousePointerClick className="w-3 h-3" />
            </div>
            <p className="text-sm font-bold text-foreground">{formatearNumeroK(creativo.clics)}</p>
            <p className="text-[10px] text-muted-foreground">Clics</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <TrendingUp className="w-3 h-3" />
            </div>
            <p className={cn('text-sm font-bold', creativo.ctr >= 4 ? 'text-success' : creativo.ctr >= 2 ? 'text-yellow-400' : 'text-red-400')}>
              {creativo.ctr.toFixed(1).replace('.', ',')}%
            </p>
            <p className="text-[10px] text-muted-foreground">CTR</p>
          </div>
        </div>

        <a
          href="https://adsmanager.facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg py-2 transition-colors w-full"
        >
          <ExternalLink className="w-3.5 h-3.5" />Ver en Meta
        </a>
      </div>
    </div>
  )
}
