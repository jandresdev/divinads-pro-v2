// ---------------------------------------------------------------------------
// Rutas de predicciones ML de DivinADS
// Expone los resultados del pipeline de regresión lineal al frontend
// ---------------------------------------------------------------------------

import { Router } from 'express'
import { requerirAutenticacion } from '../middleware/autenticacion'
import { supabaseAdmin } from '../db/supabase'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/predicciones
// Retornar las predicciones más recientes de todas las campañas del tenant
// Ordenadas por confianza descendente para mostrar primero las más fiables
// ---------------------------------------------------------------------------
router.get('/', requerirAutenticacion, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('predictions')
      .select('*, campaigns(nombre, tipo_campaña)')
      .eq('tenant_id', req.usuario!.tenantId)
      .order('confianza', { ascending: false })
      .limit(20)

    if (error) throw error

    res.json({ exito: true, datos: data ?? [] })
  } catch (error) {
    next(error)
  }
})

// ---------------------------------------------------------------------------
// GET /api/predicciones/:campaignId
// Obtener predicciones históricas de una campaña específica (últimos 30 días)
// Útil para mostrar la evolución de las predicciones en el tiempo
// ---------------------------------------------------------------------------
router.get('/:campaignId', requerirAutenticacion, async (req, res, next) => {
  try {
    const { campaignId } = req.params

    const { data, error } = await supabaseAdmin
      .from('predictions')
      .select('*')
      .eq('tenant_id', req.usuario!.tenantId)
      .eq('campaign_id', campaignId)
      .order('fecha_prediccion', { ascending: false })
      .limit(30)

    if (error) throw error

    res.json({ exito: true, datos: data ?? [] })
  } catch (error) {
    next(error)
  }
})

// ---------------------------------------------------------------------------
// POST /api/predicciones/generar
// Disparar el ciclo de predicciones manualmente desde el panel de administración
// Útil para forzar una actualización sin esperar al cron de las 3am
// ---------------------------------------------------------------------------
router.post('/generar', requerirAutenticacion, async (req, res, next) => {
  try {
    // Importación dinámica para evitar dependencias circulares con el scheduler
    const { jobEntrenarModelos } = await import('../jobs/entrenar-modelos')
    await jobEntrenarModelos()
    res.json({ exito: true, mensaje: 'Predicciones generadas correctamente' })
  } catch (error) {
    next(error)
  }
})

export default router
