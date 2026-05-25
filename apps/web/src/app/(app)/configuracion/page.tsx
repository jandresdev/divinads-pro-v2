import { Settings } from 'lucide-react'

// Página de Configuración — placeholder hasta el Paso 26
export default function PaginaConfiguracion() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Administra tu cuenta, integraciones y preferencias
        </p>
      </div>

      {/* Estado vacío — se reemplazará con el formulario real en el Paso 26 */}
      <div className="bg-card border border-border rounded-xl p-16 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/10 flex items-center justify-center">
          <Settings className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Próximamente
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm">
            Las páginas de configuración se implementarán en el Paso 26.
            Incluirá ajustes de cuenta, conexión a Meta Ads y preferencias de notificación.
          </p>
        </div>
      </div>
    </div>
  )
}
