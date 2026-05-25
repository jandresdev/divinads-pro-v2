import { cn } from '@/lib/utils'

interface PropsSkeleton {
  /** Clases adicionales de Tailwind para personalizar dimensiones y forma */
  className?: string
}

// Componente de skeleton reutilizable para estados de carga
// Usar en lugar de mostrar spinners cuando la estructura de contenido es conocida
export function Skeleton({ className }: PropsSkeleton) {
  return (
    <div
      role="status"
      aria-label="Cargando..."
      className={cn(
        'animate-pulse rounded-md bg-muted/20',
        className
      )}
      aria-hidden="true"
    />
  )
}
