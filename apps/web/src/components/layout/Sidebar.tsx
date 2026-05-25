'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Megaphone,
  BarChart3,
  MessageSquare,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Definición de cada ítem de navegación
interface ItemNavegacion {
  etiqueta: string
  href: string
  icono: React.ComponentType<{ className?: string }>
  badge?: string
}

// Lista de rutas principales del sidebar
const ITEMS_NAVEGACION: ItemNavegacion[] = [
  {
    etiqueta: 'Panel de Control',
    href: '/dashboard',
    icono: LayoutDashboard,
  },
  {
    etiqueta: 'Campañas',
    href: '/campanias',
    icono: Megaphone,
  },
  {
    etiqueta: 'Analíticas',
    href: '/analiticas',
    icono: BarChart3,
  },
  {
    etiqueta: 'Asistente IA',
    href: '/chat',
    icono: MessageSquare,
    badge: 'BETA',
  },
]

// Ítem de configuración separado del resto
const ITEM_CONFIGURACION: ItemNavegacion = {
  etiqueta: 'Configuración',
  href: '/configuracion',
  icono: Settings,
}

// Componente de un ítem individual de navegación
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
        // Base
        'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
        // Estado inactivo
        'text-muted-foreground hover:text-foreground hover:bg-background/80',
        // Estado activo
        activo && 'bg-primary/10 text-primary'
      )}
      aria-current={activo ? 'page' : undefined}
    >
      {/* Barra lateral izquierda de estado activo */}
      {activo && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full"
          aria-hidden="true"
        />
      )}

      <Icono className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">{item.etiqueta}</span>

      {/* Badge opcional (ej: BETA) */}
      {item.badge && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary/20 text-secondary leading-none">
          {item.badge}
        </span>
      )}
    </Link>
  )
}

// Props del Sidebar: permite pasar callback para cerrar menú móvil
interface PropsSidebar {
  onNavegar?: () => void
}

// Sidebar de navegación principal (desktop: permanente, móvil: usado dentro de MenuMovil)
export default function Sidebar({ onNavegar }: PropsSidebar) {
  const rutaActual = usePathname()

  // Comprueba si la ruta actual corresponde al ítem
  const estaActivo = (href: string) => rutaActual === href || rutaActual.startsWith(`${href}/`)

  return (
    <aside className="flex flex-col h-full w-64 bg-card border-r border-border">
      {/* Logo DivinADS */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border shrink-0">
        <div
          className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center"
          aria-hidden="true"
        >
          <LayoutDashboard className="w-4 h-4 text-primary" />
        </div>
        <span className="text-lg font-bold text-foreground tracking-tight">
          DivinADS
        </span>
      </div>

      {/* Navegación principal */}
      <nav
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
        aria-label="Navegación principal"
      >
        {ITEMS_NAVEGACION.map((item) => (
          <ItemNavegacionLink
            key={item.href}
            item={item}
            activo={estaActivo(item.href)}
            onClick={onNavegar}
          />
        ))}

        {/* Separador antes de Configuración */}
        <div className="pt-3 mt-3 border-t border-border" aria-hidden="true" />

        <ItemNavegacionLink
          item={ITEM_CONFIGURACION}
          activo={estaActivo(ITEM_CONFIGURACION.href)}
          onClick={onNavegar}
        />
      </nav>

      {/* Pie del sidebar con versión */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <p className="text-xs text-muted-foreground">v0.1.0</p>
      </div>
    </aside>
  )
}
