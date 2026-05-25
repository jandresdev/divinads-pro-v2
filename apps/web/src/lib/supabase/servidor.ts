import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Crear cliente de Supabase para el servidor (Server Components, Route Handlers)
export async function crearClienteServidor() {
  const almacenCookies = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return almacenCookies.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              almacenCookies.set(name, value, options)
            )
          } catch {
            // Ignorar errores al setear cookies en Server Components de solo lectura
          }
        },
      },
    }
  )
}
