import { redirect } from 'next/navigation'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

// Layout protegido para todas las rutas de la aplicación autenticada
export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await crearClienteServidor()

  // Verificar autenticación — redirigir si no hay sesión activa
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/iniciar-sesion')
  }

  // Datos del usuario para los componentes de layout
  const datosUsuario = {
    email: user.email!,
    nombre: (user.user_metadata?.nombre as string | undefined) ?? undefined,
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar permanente — visible solo en desktop (lg+) */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar />
      </div>

      {/* Área principal: topbar + contenido scrolleable */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar: contiene el menú móvil internamente */}
        <Topbar usuario={datosUsuario} />

        {/* Zona de contenido con scroll vertical */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
