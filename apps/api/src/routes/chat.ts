import { Router } from 'express'
import { requerirAutenticacion } from '../middleware/autenticacion'
import { supabaseAdmin } from '../db/supabase'

const router = Router()

// POST /api/chat/mensaje — enviar mensaje al agente (se completará en Paso 23)
router.post('/mensaje', requerirAutenticacion, async (req, res, next) => {
  res.json({
    exito: true,
    mensaje: 'Chat con el agente en desarrollo — disponible en Paso 23',
    respuesta: 'Hola, soy el Agente DivinADS. Pronto podré responder tus preguntas sobre tus campañas.',
  })
})

// GET /api/chat/historial — historial de conversación
router.get('/historial', requerirAutenticacion, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('conversation_messages')
      .select('*')
      .eq('tenant_id', req.usuario!.tenantId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) throw error

    res.json({ exito: true, datos: data ?? [] })
  } catch (error) {
    next(error)
  }
})

export default router
