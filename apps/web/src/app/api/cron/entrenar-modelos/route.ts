import { NextRequest, NextResponse } from 'next/server'
import { esCronAutorizado } from '@/lib/api/autenticar'
import { jobEntrenarModelos } from '@/lib/jobs/entrenar-modelos'

export async function GET(req: NextRequest) {
  if (!esCronAutorizado(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    await jobEntrenarModelos()
    return NextResponse.json({ exito: true, ejecutadoEn: new Date().toISOString() })
  } catch (error) {
    console.error('Error en cron entrenar-modelos:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
