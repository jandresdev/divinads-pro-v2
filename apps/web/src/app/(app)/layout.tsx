import { redirect } from 'next/navigation'
import { crearClienteServidor } from '@/lib/supabase/servidor'

// Layout protegido: verifica autenticación antes de mostrar contenido
export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await crearClienteServidor()

  const { data: { user }, error } = await supabase.auth.getUser()

  // Si no hay usuario autenticado, redirigir al login
  if (error || !user) {
    redirect('/auth/iniciar-sesion')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* TODO Paso 4: Agregar Sidebar + Topbar completos */}
      <div className="flex">
        {/* Sidebar placeholder */}
        <aside className="w-64 min-h-screen bg-card border-r border-border p-4 hidden lg:block">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-foreground mb-6">DivinADS</h2>
            <a href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground hover:bg-background transition-colors text-sm">
              📊 Dashboard
            </a>
            <a href="/campañas" className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-background transition-colors text-sm">
              📣 Campañas
            </a>
            <a href="/analiticas" className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-background transition-colors text-sm">
              📈 Analíticas
            </a>
            <a href="/configuracion" className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-background transition-colors text-sm">
              ⚙️ Configuración
            </a>
          </div>
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
