import { Router } from 'express'
import { requerirAutenticacion } from '../middleware/autenticacion'
import { supabaseAdmin } from '../db/supabase'
import { ErrorNoEncontrado } from '../utils/errores'

const router = Router()

// GET /api/agente/acciones — historial de acciones del agente
router.get('/acciones', requerirAutenticacion, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_actions')
      .select('*, campaigns(nombre)')
      .eq('tenant_id', req.usuario!.tenantId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    res.json({ exito: true, datos: data ?? [] })
  } catch (error) {
    next(error)
  }
})

// POST /api/agente/analizar — disparar análisis manual (se completará en Paso 17)
router.post('/analizar', requerirAutenticacion, async (req, res, next) => {
  res.json({
    exito: true,
    mensaje: 'Análisis del agente en desarrollo — disponible en Paso 17',
  })
})

// POST /api/agente/aprobar-accion — aprobar acción recomendada (se completará en Paso 20)
router.post('/aprobar-accion', requerirAutenticacion, async (req, res, next) => {
  res.json({
    exito: true,
    mensaje: 'Aprobación de acción en desarrollo — disponible en Paso 20',
  })
})

export default router
