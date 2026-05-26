import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/api/autenticar'

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

// ─── Contexto admin para Server Components ────────────────────────────────────

export interface ContextoAdmin {
  userId: string
  tenantId: string
  // Cliente admin que bypasea RLS — siempre filtrar manualmente por tenant_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any
}

/**
 * Obtiene el contexto del servidor con cliente admin + tenantId resuelto.
 *
 * Úsalo en Server Components para consultar datos reales sin que RLS
 * bloquee el acceso (RLS puede fallar cuando tenant_id ≠ auth.uid()).
 *
 * Siempre filtra explícitamente `.eq('tenant_id', ctx.tenantId)` en cada query.
 * Retorna null si el usuario no tiene sesión activa.
 */
export async function obtenerContextoAdmin(): Promise<ContextoAdmin | null> {
  // Obtener usuario desde la cookie de sesión (autenticación)
  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const admin = getSupabaseAdmin()

  // 1. Buscar como miembro de un tenant
  const { data: miembro } = await admin
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (miembro?.tenant_id) {
    return { userId: user.id, tenantId: miembro.tenant_id, admin }
  }

  // 2. Buscar como propietario del tenant
  const { data: tenant } = await admin
    .from('tenants')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .single()

  if (tenant?.id) {
    return { userId: user.id, tenantId: tenant.id, admin }
  }

  // 3. Fallback: userId como tenantId (cuando el tenant aún no fue creado)
  return { userId: user.id, tenantId: user.id, admin }
}
