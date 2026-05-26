'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Megaphone,
  BarChart3,
  MessageSquare,
  Settings,
  Bell,
  Bot,
  Users,
  Image,
  FileText,
  CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ItemNavegacion {
  etiqueta: string
  href: string
  icono: React.ComponentType<{ className?: string }>
  badge?: string
}

// ─── Grupos de navegación ─────────────────────────────────────────────────────

const GRUPO_PRINCIPAL: ItemNavegacion[] = [
  { etiqueta: 'Panel de Control', href: '/dashboard',        icono: LayoutDashboard },
  { etiqueta: 'Campañas',         href: '/campanias',        icono: Megaphone },
  { etiqueta: 'Cuentas',          href: '/cuentas',          icono: CreditCard },
  { etiqueta: 'Audiencias',       href: '/audiencias',       icono: Users },
  { etiqueta: 'Creativos',        href: '/creativos',        icono: Image },
]

const GRUPO_ANALISIS: ItemNavegacion[] = [
  { etiqueta: 'Analíticas',       href: '/analiticas',       icono: BarChart3 },
  { etiqueta: 'Reportes',         href: '/reportes',         icono: FileText },
]

const GRUPO_IA: ItemNavegacion[] = [
  { etiqueta: 'Automatizaciones', href: '/automatizaciones', icono: Bot },
  { etiqueta: 'Alertas',          href: '/alertas',          icono: Bell },
  { etiqueta: 'Asistente IA',     href: '/chat',             icono: MessageSquare, badge: 'BETA' },
]

const ITEM_CONFIGURACION: ItemNavegacion = {
  etiqueta: 'Configuración',
  href: '/configuracion',
  icono: Settings,
}

// ─── Componente ítem ──────────────────────────────────────────────────────────

function ItemNavegacionLink({
  item,
  activo,
  onClick,
}: {
  item: ItemNavegacion
  activo: boolean
  onClick?: () => void
}) {
  const Icono = item.icono

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
        'text-muted-foreground hover:text-foreground hover:bg-background/80',
        activo && 'bg-primary/10 text-primary'
      )}
      aria-current={activo ? 'page' : undefined}
    >
      {activo && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full"
          aria-hidden="true"
        />
      )}
      <Icono className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">{item.etiqueta}</span>
      {item.badge && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary/20 text-secondary leading-none">
          {item.badge}
        </span>
      )}
    </Link>
  )
}

function GrupoNav({
  label,
  items,
  rutaActual,
  onNavegar,
}: {
  label: string
  items: ItemNavegacion[]
  rutaActual: string
  onNavegar?: () => void
}) {
  const estaActivo = (href: string) => rutaActual === href || rutaActual.startsWith(`${href}/`)
  return (
    <div className="space-y-0.5">
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </p>
      {items.map(item => (
        <ItemNavegacionLink
          key={item.href}
          item={item}
          activo={estaActivo(item.href)}
          onClick={onNavegar}
        />
      ))}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PropsSidebar {
  onNavegar?: () => void
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar({ onNavegar }: PropsSidebar) {
  const rutaActual = usePathname()
  const estaActivo = (href: string) => rutaActual === href || rutaActual.startsWith(`${href}/`)

  return (
    <aside className="flex flex-col h-full w-64 bg-card border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center" aria-hidden="true">
          <LayoutDashboard className="w-4 h-4 text-primary" />
        </div>
        <span className="text-lg font-bold text-foreground tracking-tight">DivinADS</span>
      </div>

      {/* Navegación con scroll */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto" aria-label="Navegación principal">
        <GrupoNav label="Gestión"   items={GRUPO_PRINCIPAL} rutaActual={rutaActual} onNavegar={onNavegar} />
        <GrupoNav label="Análisis"  items={GRUPO_ANALISIS}  rutaActual={rutaActual} onNavegar={onNavegar} />
        <GrupoNav label="IA & Alertas" items={GRUPO_IA}     rutaActual={rutaActual} onNavegar={onNavegar} />

        {/* Separador + Configuración */}
        <div className="pt-1 border-t border-border" />
        <ItemNavegacionLink
          item={ITEM_CONFIGURACION}
          activo={estaActivo(ITEM_CONFIGURACION.href)}
          onClick={onNavegar}
        />
      </nav>

      {/* Plan indicator */}
      <div className="px-3 pb-3 shrink-0">
        <div className="border border-primary/20 bg-primary/5 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <p className="text-xs font-semibold text-foreground">Plan Pro</p>
            </div>
            <Link
              href="/precios"
              className="text-[10px] text-primary hover:underline font-medium"
            >
              Gestionar
            </Link>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-muted-foreground">Campañas monitoreadas</p>
              <p className="text-[10px] text-foreground font-medium">8 / ∞</p>
            </div>
            <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '35%' }} />
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
