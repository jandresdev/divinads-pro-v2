import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado, supabaseAdmin } from '@/lib/api/autenticar'
import { ejecutarSincronizacion } from '@/lib/jobs/sincronizar-meta'

// POST /api/sincronizacion — dispara una sincronización inmediata para el tenant autenticado
export async function POST(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    // Obtener la cuenta Meta activa del tenant
    const { data: cuenta, error: errorCuenta } = await supabaseAdmin
      .from('meta_accounts')
      .select('access_token, ad_account_id')
      .eq('tenant_id', usuario.tenantId)
      .eq('activa', true)
      .single()

    if (errorCuenta || !cuenta) {
      return NextResponse.json(
        { exito: false, error: 'No hay cuenta Meta configurada o activa para este tenant' },
        { status: 400 }
      )
    }

    // Ejecutar sincronización — siempre devuelve un resultado (no lanza)
    const resultado = await ejecutarSincronizacion(usuario.tenantId, {
      access_token:  cuenta.access_token,
      ad_account_id: cuenta.ad_account_id,
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
    const { data: ultimaMetrica } = await supabaseAdmin
      .from('daily_metrics')
      .select('updated_at, fecha')
      .eq('tenant_id', usuario.tenantId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
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
