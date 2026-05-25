import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado } from '@/lib/api/autenticar'

// GET /api/anomalias — listar anomalías activas
export async function GET(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    const { data, error } = await usuario.supabase
      .from('anomalies')
      .select('*, campaigns(nombre, tipo_campaña)')
      .eq('tenant_id', usuario.tenantId)
      .eq('activa', true)
      .order('severidad_score', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json({ exito: true, datos: data ?? [] })
  } catch (error) {
    console.error('[api/anomalias] Error al listar anomalías', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
