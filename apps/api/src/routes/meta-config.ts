import { Router } from 'express'
import { z } from 'zod'
import { requerirAutenticacion } from '../middleware/autenticacion'
import { supabaseAdmin } from '../db/supabase'
import { ClienteMetaAds, ErrorMetaAPI } from '../services/meta-ads-cliente'
import logger from '../utils/logger'

const router = Router()

// ---------------------------------------------------------------------------
// Esquema de validación para configurar una cuenta Meta
// ---------------------------------------------------------------------------
const esquemaConfigMeta = z.object({
  access_token: z.string().min(1, 'El access token de Meta es requerido'),
  ad_account_id: z.string().min(1, 'El ID de cuenta publicitaria es requerido'),
})

// ---------------------------------------------------------------------------
// GET /api/meta/estado
// Verifica si el tenant ya tiene una cuenta Meta configurada
// ---------------------------------------------------------------------------
router.get('/estado', requerirAutenticacion, async (req, res, next) => {
  try {
    const { data: cuenta } = await supabaseAdmin
      .from('meta_accounts')
      .select('id, ad_account_id, created_at, token_expiry')
      .eq('tenant_id', req.usuario!.tenantId)
      .eq('activa', true)
      .single()

    res.json({
      exito: true,
      datos: {
        configurada: Boolean(cuenta),
        adAccountId: cuenta?.ad_account_id ?? null,
        configuradaDesde: cuenta?.created_at ?? null,
        tokenExpiry: cuenta?.token_expiry ?? null,
      },
    })
  } catch {
    // Si no encuentra la cuenta, devolver configurada: false sin lanzar error
    res.json({ exito: true, datos: { configurada: false } })
  }
})

// ---------------------------------------------------------------------------
// POST /api/meta/configurar
// Guarda el access token de Meta — valida primero que funcione consultando campañas
// ---------------------------------------------------------------------------
router.post('/configurar', requerirAutenticacion, async (req, res, next) => {
  try {
    const { access_token, ad_account_id } = esquemaConfigMeta.parse(req.body)

    // Validar el token consultando realmente campañas en Meta
    // Si el token es inválido, ErrorMetaAPI se lanza y lo captura el manejador global
    const clienteMeta = new ClienteMetaAds(access_token, ad_account_id)
    const campañas = await clienteMeta.obtenerCampañas()

    logger.info(
      { tenantId: req.usuario!.tenantId, totalCampañas: campañas.length },
      'Token de Meta validado correctamente',
    )

    // Normalizar el ID de cuenta — agregar prefijo "act_" si no lo tiene
    const adAccountIdNormalizado = ad_account_id.startsWith('act_')
      ? ad_account_id
      : `act_${ad_account_id}`

    // Guardar o actualizar la cuenta en Supabase (upsert por tenant_id)
    const { data: cuenta, error } = await supabaseAdmin
      .from('meta_accounts')
      .upsert(
        {
          tenant_id: req.usuario!.tenantId,
          access_token,
          ad_account_id: adAccountIdNormalizado,
          activa: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' },
      )
      .select()
      .single()

    if (error) throw error

    res.json({
      exito: true,
      datos: {
        configurada: true,
        adAccountId: cuenta.ad_account_id,
        totalCampañasEncontradas: campañas.length,
      },
      mensaje: `Cuenta Meta configurada correctamente. Se encontraron ${campañas.length} campañas.`,
    })
  } catch (error) {
    // Personalizar el mensaje si el token de Meta es inválido
    if (error instanceof ErrorMetaAPI && error.esTokenExpirado) {
      logger.warn(
        { tenantId: req.usuario!.tenantId },
        'El token de Meta proporcionado es inválido o expirado',
      )
      res.status(401).json({
        exito: false,
        error: 'El access token de Meta es inválido o ha expirado. Por favor genera uno nuevo.',
      })
      return
    }

    next(error)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/meta/desconectar
// Desactiva la integración Meta del tenant (soft delete — no borra el registro)
// ---------------------------------------------------------------------------
router.delete('/desconectar', requerirAutenticacion, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('meta_accounts')
      .update({ activa: false, updated_at: new Date().toISOString() })
      .eq('tenant_id', req.usuario!.tenantId)

    if (error) throw error

    logger.info({ tenantId: req.usuario!.tenantId }, 'Cuenta Meta desconectada para el tenant')

    res.json({ exito: true, mensaje: 'Cuenta Meta desconectada correctamente' })
  } catch (error) {
    next(error)
  }
})

export default router
