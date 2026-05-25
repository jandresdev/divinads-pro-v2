import { Megaphone } from 'lucide-react'

// Página de Campañas — placeholder hasta el Paso 8
export default function PaginaCampanias() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Campañas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestiona y monitorea todas tus campañas de Meta Ads
        </p>
      </div>

      {/* Estado vacío — se reemplazará con la tabla real en el Paso 8 */}
      <div className="bg-card border border-border rounded-xl p-16 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Megaphone className="w-8 h-8 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Próximamente
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm">
            La gestión de campañas se implementará en el Paso 8. Aquí podrás
            ver, filtrar y ordenar todas tus campañas activas.
          </p>
        </div>
      </div>
    </div>
  )
}
