import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Crear cliente de Supabase para el servidor (Server Components, Route Handlers)
// Usa la API get/set/remove de @supabase/ssr 0.3.x (no la nueva getAll/setAll de 0.5+)
export async function crearClienteServidor() {
  const almacenCookies = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return almacenCookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            almacenCookies.set(name, value, options)
          } catch {
            // Ignorar errores en Server Components de solo lectura
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            almacenCookies.set(name, '', options)
          } catch {
            // Ignorar errores en Server Components de solo lectura
          }
        },
      },
    }
  )
}
