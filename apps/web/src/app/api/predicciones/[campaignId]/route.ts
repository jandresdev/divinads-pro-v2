import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado, supabaseAdmin } from '@/lib/api/autenticar'

// GET /api/predicciones/:campaignId — predicciones históricas de una campaña específica (últimos 30 días)
export async function GET(
  req: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    const { data, error } = await supabaseAdmin
      .from('predictions')
      .select('*')
      .eq('tenant_id', usuario.tenantId)
      .eq('campaign_id', params.campaignId)
      .order('fecha_prediccion', { ascending: false })
      .limit(30)

    if (error) throw error

    return NextResponse.json({ exito: true, datos: data ?? [] })
  } catch (error) {
    console.error('[api/predicciones/[campaignId]] Error al obtener predicción de campaña', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
