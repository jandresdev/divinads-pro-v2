import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado, getSupabaseAdmin } from '@/lib/api/autenticar'
import { ClienteMetaAds, ErrorMetaAPI } from '@/lib/services/meta-ads-cliente'

// GET /api/audiencias — audiencias de Meta Ads del tenant
export async function GET(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    // Admin client para bypasear RLS — la política de meta_accounts puede bloquear
    // al cliente del usuario si compara tenant_id con auth.uid()
    const admin = getSupabaseAdmin()
    const { data: cuenta, error: errCuenta } = await admin
      .from('meta_accounts')
      .select('access_token, meta_account_id')
      .eq('tenant_id', usuario.tenantId)
      .eq('activa', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (errCuenta || !cuenta) {
      return NextResponse.json({
        exito: false,
        sinConexion: true,
        error: 'No hay cuenta de Meta Ads conectada',
      })
    }

    const cliente = new ClienteMetaAds(cuenta.access_token, cuenta.meta_account_id)
    const audiencias = await cliente.obtenerAudiencias()

    return NextResponse.json({ exito: true, datos: audiencias })
  } catch (error) {
    if (error instanceof ErrorMetaAPI) {
      const mensaje = error.esTokenExpirado
        ? 'El token de Meta ha expirado. Reconecta tu cuenta en Configuración.'
        : `Error de Meta API: ${error.message}`

      return NextResponse.json({ exito: false, error: mensaje, tokenExpirado: error.esTokenExpirado })
    }

    console.error('[api/audiencias] Error al obtener audiencias:', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
