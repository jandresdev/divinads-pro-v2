import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/api/autenticar'

// POST /api/auth/meta/confirmar-cuenta — confirma la cuenta seleccionada por el usuario
export async function POST(req: NextRequest) {
  const tenantId = req.cookies.get('meta_oauth_tenant')?.value
  const longToken = req.cookies.get('meta_oauth_token')?.value

  if (!tenantId || !longToken) {
    return NextResponse.json(
      { exito: false, error: 'Sesión de OAuth expirada. Inicia el proceso de nuevo.' },
      { status: 400 }
    )
  }

  try {
    const { accountId } = await req.json()
    if (!accountId) {
      return NextResponse.json({ exito: false, error: 'accountId es requerido' }, { status: 400 })
    }

    const adAccountIdNormalizado = accountId.startsWith('act_') ? accountId : `act_${accountId}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: errorGuardar } = await (getSupabaseAdmin().from('meta_accounts') as any)
      .upsert(
        {
          tenant_id: tenantId,
          access_token: longToken,
          meta_account_id: adAccountIdNormalizado,
          activa: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,meta_account_id' }
      )

    if (errorGuardar) {
      console.error('[meta/confirmar-cuenta] Error al guardar cuenta Meta:', errorGuardar)
      return NextResponse.json({ exito: false, error: 'Error al guardar la cuenta en la base de datos' }, { status: 500 })
    }

    const respuesta = NextResponse.json({ exito: true })
    respuesta.cookies.delete('meta_oauth_tenant')
    respuesta.cookies.delete('meta_oauth_token')

    return respuesta
  } catch (err) {
    console.error('[meta/confirmar-cuenta] Error:', err)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
