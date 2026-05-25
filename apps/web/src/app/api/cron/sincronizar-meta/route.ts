import { NextRequest, NextResponse } from 'next/server'
import { esCronAutorizado } from '@/lib/api/autenticar'
import { jobSincronizarTodosLosTenants } from '@/lib/jobs/sincronizar-meta'

export async function GET(req: NextRequest) {
  if (!esCronAutorizado(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    await jobSincronizarTodosLosTenants()
    return NextResponse.json({ exito: true, ejecutadoEn: new Date().toISOString() })
  } catch (error) {
    console.error('Error en cron sincronizar-meta:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
