import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado } from '@/lib/api/autenticar'
import { ClienteMetaAds, ErrorMetaAPI } from '@/lib/services/meta-ads-cliente'

// GET /api/audiencias — audiencias de Meta Ads del tenant
export async function GET(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    // Obtener credenciales Meta del tenant
    const { data: cuenta, error: errCuenta } = await usuario.supabase
      .from('meta_accounts')
      .select('access_token, meta_account_id')
      .eq('tenant_id', usuario.tenantId)
      .eq('activa', true)
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
