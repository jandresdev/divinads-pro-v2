import { NextRequest, NextResponse } from 'next/server'
import { esCronAutorizado } from '@/lib/api/autenticar'
import { jobAgenteMonitor } from '@/lib/jobs/agente-monitor'

export async function GET(req: NextRequest) {
  if (!esCronAutorizado(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    await jobAgenteMonitor()
    return NextResponse.json({ exito: true, ejecutadoEn: new Date().toISOString() })
  } catch (error) {
    console.error('Error en cron agente-monitor:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
