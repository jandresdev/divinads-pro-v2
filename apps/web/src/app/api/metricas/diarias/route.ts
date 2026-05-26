import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado } from '@/lib/api/autenticar'

// GET /api/metricas/diarias — serie de tiempo, acepta ?dias=N (default 30, max 90)
export async function GET(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    const diasParam = parseInt(req.nextUrl.searchParams.get('dias') ?? '30', 10)
    const dias = Math.min(Math.max(diasParam, 1), 90)
    const fechaDesde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: metricas, error } = await usuario.supabase
      .from('daily_metrics')
      .select('fecha, gasto_centavos, roas, ctr, cpc, conversiones, cpa')
      .eq('tenant_id', usuario.tenantId)
      .gte('fecha', fechaDesde)
      .order('fecha', { ascending: true })

    if (error) throw error

    return NextResponse.json({ exito: true, datos: metricas ?? [] })
  } catch (error) {
    console.error('[api/metricas/diarias] Error al obtener métricas diarias', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
