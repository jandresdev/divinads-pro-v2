import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado, getSupabaseAdmin } from '@/lib/api/autenticar'
import { ClienteMetaAds, ErrorMetaAPI } from '@/lib/services/meta-ads-cliente'

// GET /api/creativos — anuncios con creativos e insights del tenant
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
    const { ads, insights } = await cliente.obtenerAnunciosConInsights()

    const insightsMap = new Map(insights.map(i => [i.ad_id, i]))

    const creativos = ads.map(ad => ({
      id: ad.id,
      nombre: ad.name,
      estado: ad.status === 'ACTIVE' ? 'activo' : 'pausado',
      campañaNombre: ad.campaign?.name ?? null,
      campañaObjetivo: ad.campaign?.objective ?? null,
      thumbnail: ad.creative?.thumbnail_url ?? null,
      titulo: ad.creative?.title ?? null,
      cuerpo: ad.creative?.body ?? null,
      ...(() => {
        const ins = insightsMap.get(ad.id)
        return {
          impresiones: ins ? parseInt(ins.impressions, 10) : 0,
          clics: ins ? parseInt(ins.clicks, 10) : 0,
          ctr: ins ? parseFloat(ins.ctr) : 0,
          gasto: ins ? parseFloat(ins.spend) : 0,
        }
      })(),
    }))

    return NextResponse.json({ exito: true, datos: creativos })
  } catch (error) {
    if (error instanceof ErrorMetaAPI) {
      const mensaje = error.esTokenExpirado
        ? 'El token de Meta ha expirado. Reconecta tu cuenta en Configuración.'
        : `Error de Meta API: ${error.message}`

      return NextResponse.json({ exito: false, error: mensaje, tokenExpirado: error.esTokenExpirado })
    }

    console.error('[api/creativos] Error al obtener creativos:', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
