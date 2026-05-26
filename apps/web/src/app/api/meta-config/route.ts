import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado, getSupabaseAdmin } from '@/lib/api/autenticar'
import { ClienteMetaAds, ErrorMetaAPI } from '@/lib/services/meta-ads-cliente'

// GET /api/meta-config — estado de la integración Meta del tenant
export async function GET(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    // Usar cliente admin para bypasear RLS — filtramos manualmente por tenant_id.
    // El cliente del usuario (con RLS) puede no ver meta_accounts si la política
    // compara tenant_id con auth.uid() en vez de resolver el tenant correctamente.
    const admin = getSupabaseAdmin()
    const { data: cuenta, error } = await admin
      .from('meta_accounts')
      .select('id, meta_account_id, nombre_cuenta, created_at')
      .eq('tenant_id', usuario.tenantId)
      .eq('activa', true)
      .order('updated_at', { ascending: false }) // La más reciente primero
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = sin filas (cuenta no configurada) — no es un error real
      console.warn('[api/meta-config] Error consultando meta_accounts:', error.message)
    }

    return NextResponse.json({
      exito: true,
      datos: {
        configurada: Boolean(cuenta),
        adAccountId: cuenta?.meta_account_id ?? null,
        nombreCuenta: cuenta?.nombre_cuenta ?? null,
        configuradaDesde: cuenta?.created_at ?? null,
      },
    })
  } catch (err) {
    console.error('[api/meta-config] Error inesperado en GET:', err)
    return NextResponse.json({ exito: true, datos: { configurada: false } })
  }
}

// POST /api/meta-config — configurar cuenta Meta (guarda access_token + ad_account_id)
export async function POST(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    const body = await req.json()
    const { access_token, ad_account_id } = body

    if (!access_token || !ad_account_id) {
      return NextResponse.json(
        { exito: false, error: 'access_token y ad_account_id son requeridos' },
        { status: 400 }
      )
    }

    // Validar el token consultando realmente campañas en Meta
    const clienteMeta = new ClienteMetaAds(access_token, ad_account_id)
    const campañas = await clienteMeta.obtenerCampañas()

    console.info(`[api/meta-config] Token de Meta validado correctamente: tenant=${usuario.tenantId} totalCampañas=${campañas.length}`)

    // Normalizar el ID de cuenta — agregar prefijo "act_" si no lo tiene
    const metaAccountIdNormalizado = ad_account_id.startsWith('act_')
      ? ad_account_id
      : `act_${ad_account_id}`

    // Guardar o actualizar la cuenta en Supabase (upsert por tenant_id + meta_account_id)
    // Usamos admin client para bypasear RLS — el usuario puede no tener permiso de escritura
    const admin = getSupabaseAdmin()
    const { data: cuenta, error } = await admin
      .from('meta_accounts')
      .upsert(
        {
          tenant_id: usuario.tenantId,
          access_token,
          meta_account_id: metaAccountIdNormalizado,
          activa: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,meta_account_id' },
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      exito: true,
      datos: {
        configurada: true,
        adAccountId: cuenta.meta_account_id,
        totalCampañasEncontradas: campañas.length,
      },
      mensaje: `Cuenta Meta configurada correctamente. Se encontraron ${campañas.length} campañas.`,
    })
  } catch (error) {
    // Personalizar el mensaje si el token de Meta es inválido
    if (error instanceof ErrorMetaAPI && error.esTokenExpirado) {
      console.warn(`[api/meta-config] El token de Meta proporcionado es inválido o expirado: tenant=${usuario.tenantId}`)
      return NextResponse.json(
        { exito: false, error: 'El access token de Meta es inválido o ha expirado. Por favor genera uno nuevo.' },
        { status: 401 }
      )
    }

    console.error('[api/meta-config] Error al configurar cuenta Meta', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
