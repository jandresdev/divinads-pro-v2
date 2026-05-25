import { Router } from 'express'
import { requerirAutenticacion } from '../middleware/autenticacion'
import { supabaseAdmin } from '../db/supabase'

const router = Router()

// GET /api/metricas — KPI agregados para el tenant
router.get('/', requerirAutenticacion, async (req, res, next) => {
  try {
    const { desde, hasta } = req.query

    // Por defecto: últimos 7 días
    const fechaHasta = hasta ? String(hasta) : new Date().toISOString().split('T')[0]
    const fechaDesde = desde
      ? String(desde)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: metricas, error } = await supabaseAdmin
      .from('daily_metrics')
      .select('fecha, gasto_centavos, roas, ctr, cpc_centavos, conversiones, cpa_centavos')
      .eq('tenant_id', req.usuario!.tenantId)
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
    res.json({
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
    next(error)
  }
})

// GET /api/metricas/diarias — serie de tiempo (últimos 30 días)
router.get('/diarias', requerirAutenticacion, async (req, res, next) => {
  try {
    const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: metricas, error } = await supabaseAdmin
      .from('daily_metrics')
      .select('fecha, gasto_centavos, roas, ctr, cpc_centavos, conversiones, cpa_centavos')
      .eq('tenant_id', req.usuario!.tenantId)
      .gte('fecha', hace30Dias)
      .order('fecha', { ascending: true })

    if (error) throw error

    res.json({ exito: true, datos: metricas ?? [] })
  } catch (error) {
    next(error)
  }
})

export default router
