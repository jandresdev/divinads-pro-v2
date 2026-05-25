import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado, supabaseAdmin } from '@/lib/api/autenticar'

// GET /api/campanias/:id — detalle de campaña
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    const { data: campaña, error } = await supabaseAdmin
      .from('campaigns')
      .select('*, daily_metrics(fecha, gasto_centavos, roas, conversiones, ctr, cpc, cpa)')
      .eq('id', params.id)
      .eq('tenant_id', usuario.tenantId)
      .single()

    if (error || !campaña) {
      return NextResponse.json({ exito: false, error: 'Campaña no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ exito: true, datos: campaña })
  } catch (error) {
    console.error('[api/campanias/[id]] Error al obtener campaña', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PATCH /api/campanias/:id — actualizar metadatos
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    const body = await req.json()
    const { nombre, meta_campaign_id, tipo_campaña, presupuesto_diario_centavos } = body

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (nombre !== undefined) updateData.nombre = nombre
    if (meta_campaign_id !== undefined) updateData.meta_campaign_id = meta_campaign_id
    if (tipo_campaña !== undefined) updateData.tipo_campaña = tipo_campaña
    if (presupuesto_diario_centavos !== undefined) updateData.presupuesto_diario_centavos = presupuesto_diario_centavos

    const { data: campaña, error } = await supabaseAdmin
      .from('campaigns')
      .update(updateData)
      .eq('id', params.id)
      .eq('tenant_id', usuario.tenantId)
      .select()
      .single()

    if (error || !campaña) {
      return NextResponse.json({ exito: false, error: 'Campaña no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ exito: true, datos: campaña })
  } catch (error) {
    console.error('[api/campanias/[id]] Error al actualizar campaña', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
