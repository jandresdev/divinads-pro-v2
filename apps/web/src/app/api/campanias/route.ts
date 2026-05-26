import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado, getSupabaseAdmin } from '@/lib/api/autenticar'

// GET /api/campanias — listar todas las campañas del tenant
export async function GET(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    const { data: campañas, error } = await getSupabaseAdmin()
      .from('campaigns')
      .select('*, daily_metrics(fecha, gasto_centavos, roas, conversiones, ctr, cpc, cpa)')
      .eq('tenant_id', usuario.tenantId)
      .neq('estado', 'DELETED')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({
      exito: true,
      datos: campañas,
      meta: { total: campañas?.length ?? 0 },
    })
  } catch (error) {
    console.error('[api/campanias] Error al listar campañas', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/campanias — vincular nueva campaña Meta
export async function POST(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    const body = await req.json()
    const { nombre, meta_campaign_id, tipo, presupuesto_diario_centavos } = body

    if (!nombre || !meta_campaign_id) {
      return NextResponse.json(
        { exito: false, error: 'nombre y meta_campaign_id son requeridos' },
        { status: 400 }
      )
    }

    const { data: campaña, error } = await getSupabaseAdmin()
      .from('campaigns')
      .insert({
        tenant_id:                   usuario.tenantId,
        nombre,
        meta_campaign_id,
        tipo:                        tipo ?? 'OTRO',
        presupuesto_diario_centavos: presupuesto_diario_centavos ?? null,
        estado:                      'ACTIVE',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ exito: true, datos: campaña }, { status: 201 })
  } catch (error) {
    console.error('[api/campanias] Error al crear campaña', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
