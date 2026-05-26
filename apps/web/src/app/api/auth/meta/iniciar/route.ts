import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado } from '@/lib/api/autenticar'

// GET /api/auth/meta/iniciar — inicia el flujo OAuth de Meta Ads
export async function GET(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  const appId = process.env.META_APP_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!appId) {
    return NextResponse.json(
      { exito: false, error: 'META_APP_ID no configurado en el servidor' },
      { status: 500 }
    )
  }

  const callbackUrl = `${appUrl}/api/auth/meta/callback`

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: callbackUrl,
    scope: 'ads_read,ads_management,business_management,read_insights',
    response_type: 'code',
    state: usuario.tenantId,
  })

  const oauthUrl = `https://www.facebook.com/v20.0/dialog/oauth?${params}`

  // Guardar tenantId en cookie temporal para recuperarlo en el callback
  const respuesta = NextResponse.redirect(oauthUrl)
  respuesta.cookies.set('meta_oauth_tenant', usuario.tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return respuesta
}
