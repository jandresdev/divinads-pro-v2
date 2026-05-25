import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas que requieren autenticación
const RUTAS_PROTEGIDAS = ['/dashboard', '/campañas', '/analiticas', '/configuracion']
// Rutas solo para usuarios no autenticados
const RUTAS_AUTH = ['/auth/iniciar-sesion', '/auth/registrarse', '/auth/olvide-contraseña']

export async function middleware(solicitud: NextRequest) {
  let respuesta = NextResponse.next({
    request: {
      headers: solicitud.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return solicitud.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            solicitud.cookies.set(name, value)
          )
          respuesta = NextResponse.next({
            request: solicitud,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refrescar sesión si ha expirado
  const { data: { user } } = await supabase.auth.getUser()

  const rutaActual = solicitud.nextUrl.pathname

  // Redirigir a login si intenta acceder a ruta protegida sin autenticación
  if (!user && RUTAS_PROTEGIDAS.some(ruta => rutaActual.startsWith(ruta))) {
    const urlRedireccion = solicitud.nextUrl.clone()
    urlRedireccion.pathname = '/auth/iniciar-sesion'
    urlRedireccion.searchParams.set('redirigir_a', rutaActual)
    return NextResponse.redirect(urlRedireccion)
  }

  // Redirigir al dashboard si ya está autenticado y va a páginas de auth
  if (user && RUTAS_AUTH.some(ruta => rutaActual.startsWith(ruta))) {
    const urlRedireccion = solicitud.nextUrl.clone()
    urlRedireccion.pathname = '/dashboard'
    return NextResponse.redirect(urlRedireccion)
  }

  return respuesta
}

export const config = {
  matcher: [
    // Aplicar a todas las rutas excepto archivos estáticos y API
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
