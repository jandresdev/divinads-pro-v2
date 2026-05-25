'use client'

// Error boundary global de Next.js — captura errores no manejados en el árbol de componentes
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface PropsError {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PaginaError({ error, reset }: PropsError) {
  // Registrar el error en la consola para depuración
  useEffect(() => {
    console.error('Error de la aplicación:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Ícono de error */}
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-destructive" aria-hidden="true" />
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">Algo salió mal</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Ocurrió un error inesperado. Por favor intenta de nuevo. Si el problema persiste, contáctanos.
        </p>

        {/* Código de digest para soporte técnico */}
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mb-4 font-mono">
            Código: {error.digest}
          </p>
        )}

        {/* Botón para reintentar la operación fallida */}
        <button
          onClick={reset}
          className="flex items-center gap-2 mx-auto px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Intentar de nuevo
        </button>
      </div>
    </div>
  )
}
