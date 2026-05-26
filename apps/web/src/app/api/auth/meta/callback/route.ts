import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/api/autenticar'

// GET /api/auth/meta/callback — maneja el retorno OAuth de Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (errorParam || !code) {
    return NextResponse.redirect(`${appUrl}/configuracion/meta?error=oauth_cancelado`)
  }

  const tenantId = req.cookies.get('meta_oauth_tenant')?.value
  if (!tenantId) {
    return NextResponse.redirect(`${appUrl}/configuracion/meta?error=sesion_expirada`)
  }

  try {
    const callbackUrl = `${appUrl}/api/auth/meta/callback`

    // 1. Intercambiar código por access_token de corta duración
    const tokenUrl = 'https://graph.facebook.com/v20.0/oauth/access_token?' + new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      redirect_uri: callbackUrl,
      client_secret: process.env.META_APP_SECRET!,
      code,
    })
    const tokenRes = await fetch(tokenUrl)
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('[meta/callback] No se recibió access_token:', tokenData)
      return NextResponse.redirect(`${appUrl}/configuracion/meta?error=token_invalido`)
    }

    // 2. Intercambiar por token de larga duración (60 días)
    const longUrl = 'https://graph.facebook.com/v20.0/oauth/access_token?' + new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      fb_exchange_token: tokenData.access_token,
    })
    const longRes = await fetch(longUrl)
    const longData = await longRes.json()
    const longToken: string = longData.access_token ?? tokenData.access_token

    // 3. Obtener cuentas publicitarias del usuario
    const accountsRes = await fetch(
      `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${longToken}`
    )
    const accountsData = await accountsRes.json()
    const adAccounts: { id: string; name: string; account_status: number; currency: string }[] =
      accountsData.data ?? []

    const cuentasActivas = adAccounts.filter(a => a.account_status === 1)

    if (cuentasActivas.length === 0 && adAccounts.length === 0) {
      return NextResponse.redirect(`${appUrl}/configuracion/meta?error=sin_cuentas`)
    }

    const cuentas = cuentasActivas.length > 0 ? cuentasActivas : adAccounts

    if (cuentas.length === 1) {
      // Una sola cuenta: conectar automáticamente
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (getSupabaseAdmin().from('meta_accounts') as any)
        .upsert(
          {
            tenant_id: tenantId,
            access_token: longToken,
            ad_account_id: cuentas[0].id,
            activa: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id' }
        )

      const respuesta = NextResponse.redirect(`${appUrl}/configuracion/meta?exito=1`)
      respuesta.cookies.delete('meta_oauth_tenant')
      return respuesta
    }

    // Múltiples cuentas: redirigir a página de selección
    // El token se guarda en cookie HttpOnly temporal; las cuentas (no sensibles) van en URL
    const cuentasEncoded = Buffer.from(JSON.stringify(
      cuentas.map(c => ({ id: c.id, nombre: c.name, moneda: c.currency }))
    )).toString('base64')

    const seleccionUrl = `${appUrl}/configuracion/meta/seleccionar-cuenta?cuentas=${cuentasEncoded}`
    const respuesta = NextResponse.redirect(seleccionUrl)

    respuesta.cookies.set('meta_oauth_token', longToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })

    return respuesta
  } catch (err) {
    console.error('[meta/callback] Error en OAuth callback:', err)
    return NextResponse.redirect(`${appUrl}/configuracion/meta?error=oauth_error`)
  }
}
