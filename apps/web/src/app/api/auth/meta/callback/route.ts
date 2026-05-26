import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/api/autenticar'

// Deriva la URL base igual que en /iniciar — debe ser idéntica para que Meta acepte el token
function obtenerAppUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
  return `${proto}://${host}`
}

// GET /api/auth/meta/callback — maneja el retorno OAuth de Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')
  const appUrl = obtenerAppUrl(req)

  // Meta canceló la autorización o hubo error en su lado
  if (errorParam || !code) {
    console.error('[meta/callback] Meta retornó error o no hubo código:', { errorParam, errorDesc })
    return NextResponse.redirect(`${appUrl}/configuracion/meta?error=oauth_cancelado`)
  }

  const tenantId = req.cookies.get('meta_oauth_tenant')?.value
  if (!tenantId) {
    console.error('[meta/callback] Cookie meta_oauth_tenant no encontrada')
    return NextResponse.redirect(`${appUrl}/configuracion/meta?error=sesion_expirada`)
  }

  // Verificar que las variables de entorno están configuradas
  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
    console.error('[meta/callback] META_APP_ID o META_APP_SECRET no están configurados en las variables de entorno')
    const params = new URLSearchParams({ error: 'config_faltante' })
    return NextResponse.redirect(`${appUrl}/configuracion/meta?${params}`)
  }

  const callbackUrl = `${appUrl}/api/auth/meta/callback`

  try {
    // 1. Intercambiar código por access_token de corta duración
    const tokenUrl = 'https://graph.facebook.com/v20.0/oauth/access_token?' + new URLSearchParams({
      client_id: process.env.META_APP_ID,
      redirect_uri: callbackUrl,
      client_secret: process.env.META_APP_SECRET,
      code,
    })
    const tokenRes = await fetch(tokenUrl)
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      // Extraer el mensaje de error de Meta para mostrarlo al usuario
      const metaError = tokenData.error
      const metaErrorCode = metaError?.code ?? 'desconocido'
      const metaErrorMsg = metaError?.message ?? 'Error desconocido'

      console.error('[meta/callback] Fallo intercambio de código:', {
        metaError,
        redirect_uri: callbackUrl,
        appUrl,
        META_APP_ID_set: !!process.env.META_APP_ID,
        META_APP_SECRET_set: !!process.env.META_APP_SECRET,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? '(no configurado)',
      })

      // Codificar info del error y redirect_uri para mostrar al usuario
      const params = new URLSearchParams({
        error: 'token_invalido',
        meta_code: String(metaErrorCode),
        meta_msg: metaErrorMsg.substring(0, 120),
        redirect_uri: callbackUrl,
      })
      return NextResponse.redirect(`${appUrl}/configuracion/meta?${params}`)
    }

    // 2. Intercambiar por token de larga duración (60 días)
    const longUrl = 'https://graph.facebook.com/v20.0/oauth/access_token?' + new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
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
      const { error: errorGuardar } = await (getSupabaseAdmin().from('meta_accounts') as any)
        .upsert(
          {
            tenant_id: tenantId,
            access_token: longToken,
            meta_account_id: cuentas[0].id,
            nombre_cuenta: cuentas[0].name ?? null,
            moneda: cuentas[0].currency ?? 'USD',
            activa: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,meta_account_id' }
        )

      if (errorGuardar) {
        console.error('[meta/callback] Error al guardar cuenta Meta en Supabase:', errorGuardar)
        const params = new URLSearchParams({ error: 'db_error', detalle: errorGuardar.message?.substring(0, 100) ?? '' })
        return NextResponse.redirect(`${appUrl}/configuracion/meta?${params}`)
      }

      const respuesta = NextResponse.redirect(`${appUrl}/configuracion/meta?exito=1`)
      respuesta.cookies.delete('meta_oauth_tenant')
      return respuesta
    }

    // Múltiples cuentas: redirigir a página de selección
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
    console.error('[meta/callback] Error inesperado en OAuth callback:', err)
    return NextResponse.redirect(`${appUrl}/configuracion/meta?error=oauth_error`)
  }
}
