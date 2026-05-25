import { Router } from 'express'
import { requerirAutenticacion } from '../middleware/autenticacion'
import { supabaseAdmin } from '../db/supabase'
import { ErrorNoEncontrado } from '../utils/errores'

const router = Router()

// GET /api/anomalias — listar anomalías activas
router.get('/', requerirAutenticacion, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('anomalies')
      .select('*, campaigns(nombre, tipo_campaña)')
      .eq('tenant_id', req.usuario!.tenantId)
      .eq('activa', true)
      .order('severidad_score', { ascending: false })
      .limit(20)

    if (error) throw error

    res.json({ exito: true, datos: data ?? [] })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/anomalias/:id — actualizar estado (marcar revisada)
router.patch('/:id', requerirAutenticacion, async (req, res, next) => {
  try {
    const { revisada } = req.body

    const { data, error } = await supabaseAdmin
      .from('anomalies')
      .update({ revisada: Boolean(revisada), updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('tenant_id', req.usuario!.tenantId)
      .select()
      .single()

    if (error || !data) throw new ErrorNoEncontrado('Anomalía')

    res.json({ exito: true, datos: data })
  } catch (error) {
    next(error)
  }
})

export default router
