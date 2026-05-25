import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado } from '@/lib/api/autenticar'

// GET /api/metricas/diarias — serie de tiempo (últimos 30 días)
export async function GET(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: metricas, error } = await usuario.supabase
      .from('daily_metrics')
      .select('fecha, gasto_centavos, roas, ctr, cpc, conversiones, cpa')
      .eq('tenant_id', usuario.tenantId)
      .gte('fecha', hace30Dias)
      .order('fecha', { ascending: true })

    if (error) throw error

    return NextResponse.json({ exito: true, datos: metricas ?? [] })
  } catch (error) {
    console.error('[api/metricas/diarias] Error al obtener métricas diarias', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
