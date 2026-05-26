import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado, getSupabaseAdmin } from '@/lib/api/autenticar'

// GET /api/agente/acciones — historial de acciones del agente para el tenant
export async function GET(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('agent_actions')
      .select('*, campaigns(nombre)')
      .eq('tenant_id', usuario.tenantId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ exito: true, datos: data ?? [] })
  } catch (error) {
    console.error('[api/agente/acciones] Error al obtener historial de acciones', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
