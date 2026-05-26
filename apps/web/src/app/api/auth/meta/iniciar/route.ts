import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado } from '@/lib/api/autenticar'

// Deriva la URL base de la app desde env var o desde los headers del request de Vercel
function obtenerAppUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
  return `${proto}://${host}`
}

// GET /api/auth/meta/iniciar — inicia el flujo OAuth de Meta Ads
export async function GET(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  const appId = process.env.META_APP_ID
  const appUrl = obtenerAppUrl(req)

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
    scope: 'ads_read,ads_management,business_management',
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
