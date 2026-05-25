// Utilidad de autenticación para Route Handlers de Next.js
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cliente admin con Service Role — inicializado de forma lazy para evitar
// crash en módulo cuando SUPABASE_SERVICE_ROLE_KEY no está configurado.
// Usa el anon key como fallback en dev local (queries respetarán RLS).
let _adminClient: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin(): ReturnType<typeof createClient> {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _adminClient
}

// Proxy para compatibilidad retroactiva con código que importa `supabaseAdmin` directamente.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdmin: any = new Proxy({}, {
  get(_, prop: string | symbol) {
    const client = getSupabaseAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (client as any)[prop]
    return typeof val === 'function' ? val.bind(client) : val
  },
})

export interface UsuarioAutenticado {
  id: string
  email: string
  tenantId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any  // cliente autenticado con sesión del usuario — respeta RLS
}

// Resuelve el tenant_id usando el cliente del usuario (respeta RLS en tenant_members)
async function resolverTenant(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  email: string
): Promise<UsuarioAutenticado> {
  const { data: miembro } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', userId)
    .single()
  return { id: userId, email, tenantId: miembro?.tenant_id ?? userId, supabase }
}

// Autenticar request: soporta Bearer token y cookies de sesión Supabase
export async function autenticarRequest(req: NextRequest): Promise<UsuarioAutenticado | null> {
  // 1. Intentar Bearer token (llamadas programáticas)
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    // Cliente anon + token del usuario en el header → respeta RLS con sesión del usuario
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!error && user) return resolverTenant(supabase, user.id, user.email!)
  }

  // 2. Fallback: sesión de cookie (llamadas desde el mismo origen / dashboard)
  // Usa la API get/set/remove de @supabase/ssr 0.3.x (no getAll/setAll de 0.5+)
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!error && user) return resolverTenant(supabase, user.id, user.email!)
  } catch {
    // cookies() puede lanzar fuera del contexto de request — ignorar silenciosamente
  }

  return null
}

// Respuesta estándar de no autorizado
export function noAutorizado() {
  return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 })
}

// Verificar que la request viene de Vercel Cron (CRON_SECRET)
// Fail-closed: si CRON_SECRET no está configurado, rechaza toda request
export function esCronAutorizado(req: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return false
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}
