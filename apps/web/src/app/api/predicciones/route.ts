import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado, supabaseAdmin } from '@/lib/api/autenticar'

// GET /api/predicciones — predicciones más recientes de todas las campañas del tenant
export async function GET(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    const { data, error } = await supabaseAdmin
      .from('predictions')
      .select('*, campaigns(nombre, tipo_campaña)')
      .eq('tenant_id', usuario.tenantId)
      .order('confianza', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json({ exito: true, datos: data ?? [] })
  } catch (error) {
    console.error('[api/predicciones] Error al obtener predicciones', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
