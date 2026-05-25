// Página principal del dashboard — Server Component
import { Suspense } from 'react'
import GrupoKPIs from '@/components/dashboard/GrupoKPIs'
import ContenedorGraficoMultimetrica from '@/components/dashboard/ContenedorGraficoMultimetrica'
import ContenedorPresupuesto from '@/components/dashboard/ContenedorPresupuesto'
import ContenedorTablaCampañas from '@/components/dashboard/ContenedorTablaCampañas'
import ContenedorPanelAlertas from '@/components/dashboard/ContenedorPanelAlertas'
import ContenedorInsightsIA from '@/components/dashboard/ContenedorInsightsIA'
import SelectorPeriodoDashboard from '@/components/dashboard/SelectorPeriodoDashboard'

// Convierte el param de URL al número de días correspondiente
function resolverDias(periodo: string | undefined): number {
  switch (periodo) {
    case '7':   return 7
    case '30':  return 30
    case 'mes': return new Date().getDate() // días transcurridos del mes actual
    default:    return 1
  }
}

export default async function PaginaDashboard({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const { periodo } = await searchParams
  const periodoActual = periodo ?? '1'
  const diasPeriodo   = resolverDias(periodoActual)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Panel de Control</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Datos actualizados cada 15 minutos desde Meta Ads
        </p>
      </div>

      {/* Selector de período — cliente, navega con query param */}
      <Suspense>
        <SelectorPeriodoDashboard periodoActual={periodoActual} />
      </Suspense>

      {/* KPI Cards — métricas reales desde Supabase (con fallback a datos demo) */}
      <GrupoKPIs diasPeriodo={diasPeriodo} />

      {/* Fila de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ContenedorGraficoMultimetrica diasPeriodo={diasPeriodo} />
        </div>
        <ContenedorPresupuesto />
      </div>

      {/* Fila de tabla + alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ContenedorTablaCampañas />
        </div>
        <ContenedorPanelAlertas />
      </div>

      <ContenedorInsightsIA />
    </div>
  )
}
