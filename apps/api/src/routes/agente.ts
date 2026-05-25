import { Router } from 'express'
import { requerirAutenticacion } from '../middleware/autenticacion'
import { supabaseAdmin } from '../db/supabase'
import { ejecutarAgente } from '../services/claude-cliente'
import { ejecutarHerramienta } from '../services/herramientas-agente'
import { ejecutarAccion, TipoAccionEjecutable } from '../services/ejecutor-acciones'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/agente/acciones — historial de acciones del agente para el tenant
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// POST /api/agente/analizar — análisis real de una anomalía con Claude
// ---------------------------------------------------------------------------

/**
 * Dispara el análisis de una anomalía usando el agente Claude con tool_use.
 * Requiere anomaliaId y campaignId en el body.
 * Retorna la respuesta estructurada del agente: análisis, opciones y recomendación.
 */
router.post('/analizar', requerirAutenticacion, async (req, res, next) => {
  try {
    const { anomaliaId, campaignId } = req.body

    // Validar parámetros obligatorios
    if (!anomaliaId || !campaignId) {
      res.status(400).json({ exito: false, error: 'Se requiere anomaliaId y campaignId' })
      return
    }

    // Obtener la anomalía verificando que pertenezca al tenant autenticado
    const { data: anomalia } = await supabaseAdmin
      .from('anomalies')
      .select('tipo, titulo, severidad_score')
      .eq('id', anomaliaId)
      .eq('tenant_id', req.usuario!.tenantId)
      .single()

    if (!anomalia) {
      res.status(404).json({ exito: false, error: 'Anomalía no encontrada' })
      return
    }

    // Construir el mensaje de análisis con el contexto de la anomalía
    const mensaje = `Analiza la anomalía: ${anomalia.titulo} (${anomalia.tipo}) en la campaña ${campaignId}. Severidad: ${anomalia.severidad_score}/100.`

    // Invocar al agente con capacidad de usar herramientas para recopilar contexto
    const respuesta = await ejecutarAgente(mensaje, ejecutarHerramienta)

    res.json({ exito: true, datos: respuesta })
  } catch (error) {
    next(error)
  }
})

// ---------------------------------------------------------------------------
// POST /api/agente/aprobar-accion — aprobar o rechazar una acción recomendada
// ---------------------------------------------------------------------------

/**
 * Procesa la decisión del usuario sobre una acción recomendada por el agente.
 * Si aprobada=true: ejecuta la acción en Meta Ads y registra el resultado.
 * Si aprobada=false: marca la acción como rechazada sin ejecutar nada en Meta.
 */
router.post('/aprobar-accion', requerirAutenticacion, async (req, res, next) => {
  try {
    const { accionId, aprobada } = req.body

    // Validar parámetros obligatorios
    if (!accionId || aprobada === undefined) {
      res.status(400).json({ exito: false, error: 'Se requiere accionId y aprobada (boolean)' })
      return
    }

    // Obtener la acción verificando que pertenezca al tenant autenticado
    const { data: accion } = await supabaseAdmin
      .from('agent_actions')
      .select('*')
      .eq('id', accionId)
      .eq('tenant_id', req.usuario!.tenantId)
      .single()

    if (!accion) {
      res.status(404).json({ exito: false, error: 'Acción no encontrada' })
      return
    }

    // -----------------------------------------------------------------------
    // Caso: el usuario rechazó la acción — registrar y finalizar
    // -----------------------------------------------------------------------
    if (!aprobada) {
      await supabaseAdmin
        .from('agent_actions')
        .update({
          estado: 'rechazada',
          updated_at: new Date().toISOString(),
        })
        .eq('id', accionId)

      res.json({ exito: true, mensaje: 'Acción rechazada por el usuario.' })
      return
    }

    // -----------------------------------------------------------------------
    // Caso: el usuario aprobó la acción — ejecutar en Meta Ads
    // -----------------------------------------------------------------------
    const resultado = await ejecutarAccion(
      req.usuario!.tenantId,
      accion.campaign_id,
      accion.tipo_accion as TipoAccionEjecutable,
      (accion.parametros_accion as Record<string, unknown>) ?? {}
    )

    // Actualizar el estado de la acción según el resultado de la ejecución
    await supabaseAdmin
      .from('agent_actions')
      .update({
        estado: resultado.exitoso ? 'ejecutada' : 'error_ejecucion',
        // Registrar la marca de tiempo solo si la ejecución fue exitosa
        ejecutada_at: resultado.exitoso ? new Date().toISOString() : null,
        resultado_ejecucion: resultado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accionId)

    res.json({ exito: true, datos: resultado })
  } catch (error) {
    next(error)
  }
})

export default router
