import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado } from '@/lib/api/autenticar'

interface FilaMetrica {
  gasto_centavos: number | null
  roas: number | null
  ctr: number | null
  cpc: number | null
  conversiones: number | null
  cpa: number | null
  fecha: string | null
}

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

    const { data: metricas, error } = await usuario.supabase
      .from('daily_metrics')
      .select('fecha, gasto_centavos, roas, ctr, cpc, conversiones, cpa')
      .eq('tenant_id', usuario.tenantId)
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)
      .order('fecha', { ascending: true })

    if (error) throw error

    // Calcular totales
    const totales = ((metricas ?? []) as FilaMetrica[]).reduce(
      (acc: { gastoTotal: number; conversionesTotal: number; roasPromedio: number; ctrPromedio: number }, m: FilaMetrica) => ({
        gastoTotal: acc.gastoTotal + (m.gasto_centavos ?? 0),
        conversionesTotal: acc.conversionesTotal + (m.conversiones ?? 0),
        roasPromedio: acc.roasPromedio + (m.roas ?? 0),
        ctrPromedio: acc.ctrPromedio + (m.ctr ?? 0),
      }),
      { gastoTotal: 0, conversionesTotal: 0, roasPromedio: 0, ctrPromedio: 0 }
    )

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
