// Página principal del dashboard — Server Component
import GrupoKPIs from '@/components/dashboard/GrupoKPIs'
import ContenedorGraficoMultimetrica from '@/components/dashboard/ContenedorGraficoMultimetrica'
import ContenedorPresupuesto from '@/components/dashboard/ContenedorPresupuesto'
import ContenedorTablaCampañas from '@/components/dashboard/ContenedorTablaCampañas'

export default async function PaginaDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Panel de Control</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Datos actualizados cada 15 minutos desde Meta Ads
        </p>
      </div>

      {/* Selector de período — placeholder, se conectará con estado real en Paso 5 */}
      <div className="flex flex-wrap items-center gap-2">
        {['Hoy', 'Últimos 7 días', 'Últimos 30 días', 'Este mes'].map((periodo) => (
          <button
            key={periodo}
            className="px-3 py-1.5 rounded-lg text-sm bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          >
            {periodo}
          </button>
        ))}
      </div>

      {/* KPI Cards — métricas reales desde Supabase (con fallback a datos demo) */}
      <GrupoKPIs />

      {/* Fila de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico multi-métrica (Gasto / ROAS / Conversiones) */}
        <div className="lg:col-span-2">
          <ContenedorGraficoMultimetrica />
        </div>

        {/* Gráfico dona de asignación de presupuesto por tipo de campaña */}
        <ContenedorPresupuesto />
      </div>

      {/* Fila de tabla + alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla de top campañas con ordenamiento por columna */}
        <div className="lg:col-span-2">
          <ContenedorTablaCampañas />
        </div>

        {/* Panel de alertas y anomalías — skeleton */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="h-5 w-28 bg-muted/20 rounded skeleton mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/10 rounded skeleton" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
