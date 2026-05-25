import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(solicitud: NextRequest) {
  let respuesta = NextResponse.next({
    request: {
      headers: solicitud.headers,
    },
  })

  // Usa la API get/set/remove de @supabase/ssr 0.3.x para refrescar el token
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return solicitud.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          solicitud.cookies.set({ name, value, ...options })
          respuesta = NextResponse.next({ request: solicitud })
          respuesta.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          solicitud.cookies.set({ name, value: '', ...options })
          respuesta = NextResponse.next({ request: solicitud })
          respuesta.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  await supabase.auth.getUser()

  return respuesta
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
