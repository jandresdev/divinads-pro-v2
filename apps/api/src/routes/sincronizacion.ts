import { Router } from 'express'
import { requerirAutenticacion } from '../middleware/autenticacion'
import { ejecutarSincronizacion } from '../jobs/sincronizar-meta'
import { supabaseAdmin } from '../db/supabase'

const router = Router()

// ---------------------------------------------------------------------------
// POST /api/sincronizacion/manual
// Dispara una sincronización inmediata para el tenant autenticado
// Útil para que el usuario refresque datos sin esperar el cron de 15 min
// ---------------------------------------------------------------------------
router.post('/manual', requerirAutenticacion, async (req, res, next) => {
  try {
    // Obtener la cuenta Meta activa del tenant
    const { data: cuenta, error: errorCuenta } = await supabaseAdmin
      .from('meta_accounts')
      .select('access_token, ad_account_id')
      .eq('tenant_id', req.usuario!.tenantId)
      .eq('activa', true)
      .single()

    if (errorCuenta || !cuenta) {
      res.status(400).json({
        exito: false,
        error: 'No hay cuenta Meta configurada o activa para este tenant',
      })
      return
    }

    // Ejecutar sincronización — siempre devuelve un resultado (no lanza)
    const resultado = await ejecutarSincronizacion(req.usuario!.tenantId, {
      access_token:  cuenta.access_token,
      ad_account_id: cuenta.ad_account_id,
    })

    if (!resultado.exitoso) {
      // La sincronización falló — devolver 502 con el detalle del error
      res.status(502).json({
        exito: false,
        error: resultado.error ?? 'Error al sincronizar con Meta API',
        datos: resultado,
      })
      return
    }

    res.json({ exito: true, datos: resultado })
  } catch (error) {
    next(error)
  }
})

// ---------------------------------------------------------------------------
// GET /api/sincronizacion/estado
// Devuelve cuándo fue la última sincronización exitosa para el tenant
// ---------------------------------------------------------------------------
router.get('/estado', requerirAutenticacion, async (req, res, next) => {
  try {
    // La forma más directa de saber el último sync es mirar el updated_at más reciente
    // en daily_metrics — ese campo se actualiza en cada upsert exitoso
    const { data: ultimaMetrica } = await supabaseAdmin
      .from('daily_metrics')
      .select('updated_at, fecha')
      .eq('tenant_id', req.usuario!.tenantId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    res.json({
      exito: true,
      datos: {
        ultimaActualizacion: ultimaMetrica?.updated_at ?? null,
        ultimaFecha:         ultimaMetrica?.fecha      ?? null,
        proximaActualizacion: 'En los próximos 15 minutos',
        frecuencia:          'Cada 15 minutos automáticamente',
      },
    })
  } catch {
    // Si no hay métricas aún, devolver estado inicial sin error
    res.json({
      exito: true,
      datos: {
        ultimaActualizacion: null,
        ultimaFecha:         null,
        proximaActualizacion: 'En los próximos 15 minutos',
        frecuencia:          'Cada 15 minutos automáticamente',
      },
    })
  }
})

export default router
