import { NextRequest, NextResponse } from 'next/server'
import { esCronAutorizado } from '@/lib/api/autenticar'
import { jobValidarResultados } from '@/lib/jobs/validar-resultados'

export async function GET(req: NextRequest) {
  if (!esCronAutorizado(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    await jobValidarResultados()
    return NextResponse.json({ exito: true, ejecutadoEn: new Date().toISOString() })
  } catch (error) {
    console.error('Error en cron validar-resultados:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
