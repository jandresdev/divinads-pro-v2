import { crearClienteServidor } from '@/lib/supabase/servidor'

// Página principal del dashboard (placeholder - se completará en Paso 5-10)
export default async function PaginaDashboard() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Panel de Control</h1>
        <p className="text-muted-foreground">
          Bienvenido de vuelta, <strong>{user?.email}</strong>
        </p>
      </div>

      {/* Placeholder KPI Cards - se implementará en Paso 5 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {['Gasto', 'ROAS', 'CTR', 'CPC', 'Conversiones', 'CPA'].map((kpi) => (
          <div key={kpi} className="bg-card border border-border rounded-xl p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">{kpi}</p>
            <div className="h-4 bg-muted/20 rounded skeleton mt-2"></div>
          </div>
        ))}
      </div>

      <p className="text-muted-foreground text-sm">
        ✅ Autenticación configurada. Dashboard completo se implementa en los Pasos 5-10.
      </p>
    </div>
  )
}
