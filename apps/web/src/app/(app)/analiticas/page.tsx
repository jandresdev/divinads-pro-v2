import { BarChart3 } from 'lucide-react'

// Página de Analíticas — placeholder hasta los Pasos 6-7
export default function PaginaAnaliticas() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analíticas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visualiza el rendimiento de tus campañas con gráficos avanzados
        </p>
      </div>

      {/* Estado vacío — se reemplazará con gráficos reales en los Pasos 6-7 */}
      <div className="bg-card border border-border rounded-xl p-16 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-secondary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Próximamente
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm">
            Los gráficos interactivos de analíticas se implementarán en los
            Pasos 6 y 7. Incluirá métricas de ROAS, CTR, CPA y más.
          </p>
        </div>
      </div>
    </div>
  )
}
