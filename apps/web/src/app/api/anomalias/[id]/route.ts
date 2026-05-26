import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado, getSupabaseAdmin } from '@/lib/api/autenticar'

// PATCH /api/anomalias/:id — marcar revisada
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    const { id } = await params
    const body = await req.json()
    const { revisada } = body

    const { data, error } = await getSupabaseAdmin()
      .from('anomalies')
      .update({ revisada: Boolean(revisada), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', usuario.tenantId)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ exito: false, error: 'Anomalía no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ exito: true, datos: data })
  } catch (error) {
    console.error('[api/anomalias/[id]] Error al actualizar anomalía', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
