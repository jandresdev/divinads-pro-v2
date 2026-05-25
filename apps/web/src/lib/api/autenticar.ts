// Utilidad de autenticación para Route Handlers de Next.js
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// Autenticar request desde el navegador (usa cookie de sesión Supabase)
// O desde Bearer token (para compatibilidad con llamadas directas a la API)
export async function autenticarRequest(req: NextRequest): Promise<UsuarioAutenticado | null> {
  // Intentar Bearer token primero (para llamadas programáticas)
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (!error && user) {
      const { data: miembro } = await supabaseAdmin
        .from('tenant_members').select('tenant_id').eq('user_id', user.id).single()
      return { id: user.id, email: user.email!, tenantId: miembro?.tenant_id ?? user.id }
    }
  }
  return null
}

// Respuesta estándar de no autorizado
export function noAutorizado() {
  return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 })
}

// Verificar que la request viene de Vercel Cron (CRON_SECRET)
export function esCronAutorizado(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}
