import { NextRequest, NextResponse } from 'next/server'
import { esCronAutorizado } from '@/lib/api/autenticar'
import { jobCalcularFeatures } from '@/lib/jobs/calcular-features'

export async function GET(req: NextRequest) {
  if (!esCronAutorizado(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    await jobCalcularFeatures()
    return NextResponse.json({ exito: true, ejecutadoEn: new Date().toISOString() })
  } catch (error) {
    console.error('Error en cron calcular-features:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
