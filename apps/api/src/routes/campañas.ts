import { Router } from 'express'
import { z } from 'zod'
import { requerirAutenticacion } from '../middleware/autenticacion'
import { supabaseAdmin } from '../db/supabase'
import { ErrorNoEncontrado } from '../utils/errores'

const router = Router()

// Esquema de validación para crear/actualizar campaña
const esquemaCampaña = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  meta_campaign_id: z.string().min(1, 'El ID de campaña de Meta es requerido'),
  tipo_campaña: z.enum(['Prospección', 'Remarketing', 'Retargeting', 'Conversión']).optional(),
  presupuesto_diario_centavos: z.number().int().positive().optional(),
})

// GET /api/campanas — listar todas las campañas del tenant
router.get('/', requerirAutenticacion, async (req, res, next) => {
  try {
    const { data: campañas, error } = await supabaseAdmin
      .from('campaigns')
      .select('*, daily_metrics(fecha, gasto_centavos, roas, conversiones, ctr, cpc, cpa) ')
      .eq('tenant_id', req.usuario!.tenantId)
      .eq('activa', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    res.json({
      exito: true,
      datos: campañas,
      meta: { total: campañas?.length ?? 0 },
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/campanas/:id — detalle de campaña
router.get('/:id', requerirAutenticacion, async (req, res, next) => {
  try {
    const { data: campaña, error } = await supabaseAdmin
      .from('campaigns')
      .select('*, daily_metrics(fecha, gasto_centavos, roas, conversiones, ctr, cpc, cpa)')
      .eq('id', req.params.id)
      .eq('tenant_id', req.usuario!.tenantId)
      .single()

    if (error || !campaña) throw new ErrorNoEncontrado('Campaña')

    res.json({ exito: true, datos: campaña })
  } catch (error) {
    next(error)
  }
})

// POST /api/campanas — vincular nueva campaña Meta
router.post('/', requerirAutenticacion, async (req, res, next) => {
  try {
    const datos = esquemaCampaña.parse(req.body)

    const { data: campaña, error } = await supabaseAdmin
      .from('campaigns')
      .insert({
        tenant_id: req.usuario!.tenantId,
        ...datos,
        activa: true,
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ exito: true, datos: campaña })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/campanas/:id — actualizar metadatos
router.patch('/:id', requerirAutenticacion, async (req, res, next) => {
  try {
    const datos = esquemaCampaña.partial().parse(req.body)

    const { data: campaña, error } = await supabaseAdmin
      .from('campaigns')
      .update({ ...datos, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('tenant_id', req.usuario!.tenantId)
      .select()
      .single()

    if (error || !campaña) throw new ErrorNoEncontrado('Campaña')

    res.json({ exito: true, datos: campaña })
  } catch (error) {
    next(error)
  }
})

export default router
