import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado, supabaseAdmin } from '@/lib/api/autenticar'

// GET /api/metricas — KPI agregados para el tenant
export async function GET(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')

    // Por defecto: últimos 7 días
    const fechaHasta = hasta ?? new Date().toISOString().split('T')[0]
    const fechaDesde = desde ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: metricas, error } = await supabaseAdmin
      .from('daily_metrics')
      .select('fecha, gasto_centavos, roas, ctr, cpc_centavos, conversiones, cpa_centavos')
      .eq('tenant_id', usuario.tenantId)
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)
      .order('fecha', { ascending: true })

    if (error) throw error

    // Calcular totales
    const totales = (metricas ?? []).reduce((acc, m) => ({
      gastoTotal: acc.gastoTotal + (m.gasto_centavos ?? 0),
      conversionesTotal: acc.conversionesTotal + (m.conversiones ?? 0),
      roasPromedio: acc.roasPromedio + (m.roas ?? 0),
      ctrPromedio: acc.ctrPromedio + (m.ctr ?? 0),
    }), { gastoTotal: 0, conversionesTotal: 0, roasPromedio: 0, ctrPromedio: 0 })

    const numDias = metricas?.length ?? 1
    return NextResponse.json({
      exito: true,
      datos: {
        gasto: totales.gastoTotal / 100,
        conversiones: totales.conversionesTotal,
        roas: totales.roasPromedio / numDias,
        ctr: totales.ctrPromedio / numDias,
        periodo: { desde: fechaDesde, hasta: fechaHasta },
      },
    })
  } catch (error) {
    console.error('[api/metricas] Error al obtener métricas', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
