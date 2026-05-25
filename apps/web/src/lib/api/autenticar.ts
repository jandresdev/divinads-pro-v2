// Utilidad de autenticación para Route Handlers de Next.js
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cliente admin con Service Role para operaciones del servidor
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export interface UsuarioAutenticado {
  id: string
  email: string
  tenantId: string
}

// Resuelve el tenant_id a partir del user.id
async function resolverTenant(userId: string, email: string): Promise<UsuarioAutenticado> {
  const { data: miembro } = await supabaseAdmin
    .from('tenant_members').select('tenant_id').eq('user_id', userId).single()
  return { id: userId, email, tenantId: miembro?.tenant_id ?? userId }
}

// Autenticar request: soporta Bearer token (llamadas programáticas) y
// cookies de sesión Supabase (llamadas desde el navegador en el mismo origen)
export async function autenticarRequest(req: NextRequest): Promise<UsuarioAutenticado | null> {
  // 1. Intentar Bearer token (para llamadas programáticas o desde mobile)
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (!error && user) return resolverTenant(user.id, user.email!)
  }

  // 2. Fallback: sesión de cookie (llamadas desde el mismo origen / dashboard)
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!error && user) return resolverTenant(user.id, user.email!)
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
