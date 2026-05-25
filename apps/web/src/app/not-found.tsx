// Página 404 — se muestra cuando ninguna ruta coincide con la URL solicitada
import Link from 'next/link'
import { Home } from 'lucide-react'

export default function PaginaNoEncontrada() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Número 404 decorativo */}
        <p className="text-8xl font-bold text-primary/20 mb-4" aria-hidden="true">
          404
        </p>

        <h2 className="text-xl font-bold text-foreground mb-2">Página no encontrada</h2>
        <p className="text-sm text-muted-foreground mb-6">
          La página que buscas no existe o fue movida.
        </p>

        {/* Enlace de regreso al dashboard */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors"
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          Volver al dashboard
        </Link>
      </div>
    </div>
  )
}
