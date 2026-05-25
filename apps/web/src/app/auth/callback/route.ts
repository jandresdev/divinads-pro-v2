import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Ruta de callback para OAuth (Google, GitHub)
// Supabase redirige aquí después de autenticación exitosa
export async function GET(solicitud: NextRequest) {
  const url = new URL(solicitud.url)
  const codigo = url.searchParams.get('code')
  const siguienteUrl = url.searchParams.get('next') ?? '/dashboard'

  if (codigo) {
    const almacenCookies = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return almacenCookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              almacenCookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Intercambiar el código de autorización por una sesión
    const { error } = await supabase.auth.exchangeCodeForSession(codigo)

    if (!error) {
      // Redirigir al dashboard o a la URL solicitada
      return NextResponse.redirect(new URL(siguienteUrl, solicitud.url))
    }
  }

  // Si hay error, redirigir al login con mensaje de error
  return NextResponse.redirect(
    new URL('/auth/iniciar-sesion?error=auth', solicitud.url)
  )
}
