import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado, getSupabaseAdmin } from '@/lib/api/autenticar'
import { ejecutarSincronizacion } from '@/lib/jobs/sincronizar-meta'

// POST /api/sincronizacion — dispara una sincronización inmediata para el tenant autenticado
export async function POST(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    // Usar cliente admin para bypasear RLS — la política de meta_accounts puede bloquear
    // al cliente del usuario si compara tenant_id con auth.uid() en vez del tenant real
    const admin = getSupabaseAdmin()
    const { data: cuenta, error: errorCuenta } = await admin
      .from('meta_accounts')
      .select('id, access_token, meta_account_id')
      .eq('tenant_id', usuario.tenantId)
      .eq('activa', true)
      .order('updated_at', { ascending: false }) // La más reciente primero
      .limit(1)
      .single()

    if (errorCuenta || !cuenta) {
      return NextResponse.json(
        { exito: false, error: 'No hay cuenta Meta configurada o activa para este tenant' },
        { status: 400 }
      )
    }

    // Ejecutar sincronización — siempre devuelve un resultado (no lanza)
    const resultado = await ejecutarSincronizacion(usuario.tenantId, {
      uuid:            cuenta.id,
      access_token:    cuenta.access_token,
      meta_account_id: cuenta.meta_account_id,
    })

    if (!resultado.exitoso) {
      // La sincronización falló — devolver 502 con el detalle del error
      return NextResponse.json(
        { exito: false, error: resultado.error ?? 'Error al sincronizar con Meta API', datos: resultado },
        { status: 502 }
      )
    }

    return NextResponse.json({ exito: true, datos: resultado })
  } catch (error) {
    console.error('[api/sincronizacion] Error al ejecutar sincronización manual', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}

// GET /api/sincronizacion — estado de la última sincronización del tenant
export async function GET(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    // La forma más directa de saber el último sync es mirar el updated_at más reciente
    // en daily_metrics — ese campo se actualiza en cada upsert exitoso
    const adminGet = getSupabaseAdmin()
    const { data: ultimaMetrica } = await adminGet
      .from('daily_metrics')
      .select('created_at, fecha')
      .eq('tenant_id', usuario.tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      exito: true,
      datos: {
        ultimaActualizacion: ultimaMetrica?.created_at ?? null,
        ultimaFecha:         ultimaMetrica?.fecha      ?? null,
        proximaActualizacion: 'En los próximos 15 minutos',
        frecuencia:          'Cada 15 minutos automáticamente',
      },
    })
  } catch {
    // Si no hay métricas aún, devolver estado inicial sin error
    return NextResponse.json({
      exito: true,
      datos: {
        ultimaActualizacion: null,
        ultimaFecha:         null,
        proximaActualizacion: 'En los próximos 15 minutos',
        frecuencia:          'Cada 15 minutos automáticamente',
      },
    })
  }
}
