import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado } from '@/lib/api/autenticar'
import { ejecutarAgente } from '@/lib/services/claude-cliente'
import { ejecutarHerramienta } from '@/lib/services/herramientas-agente'

// POST /api/agente/analizar — análisis real de una anomalía con Claude
export async function POST(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    const body = await req.json()
    const { anomaliaId, campaignId } = body

    // Validar parámetros obligatorios
    if (!anomaliaId || !campaignId) {
      return NextResponse.json(
        { exito: false, error: 'Se requiere anomaliaId y campaignId' },
        { status: 400 }
      )
    }

    // Obtener la anomalía verificando que pertenezca al tenant autenticado
    const { data: anomalia } = await usuario.supabase
      .from('anomalies')
      .select('tipo, titulo, severidad_score')
      .eq('id', anomaliaId)
      .eq('tenant_id', usuario.tenantId)
      .single()

    if (!anomalia) {
      return NextResponse.json({ exito: false, error: 'Anomalía no encontrada' }, { status: 404 })
    }

    // Verificar que campaignId también pertenezca al tenant autenticado (previene IDOR)
    const { data: campana } = await usuario.supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('tenant_id', usuario.tenantId)
      .single()

    if (!campana) {
      return NextResponse.json({ exito: false, error: 'Campaña no encontrada' }, { status: 404 })
    }

    // Construir el mensaje de análisis con el contexto de la anomalía
    const mensaje = `Analiza la anomalía: ${anomalia.titulo} (${anomalia.tipo}) en la campaña ${campaignId}. Severidad: ${anomalia.severidad_score}/100.`

    // Crear despachador de herramientas vinculado al tenant autenticado
    const despachadorHerramientas = (nombre: string, input: Record<string, unknown>) =>
      ejecutarHerramienta(nombre, input, usuario.tenantId)

    // Invocar al agente con capacidad de usar herramientas para recopilar contexto
    const respuesta = await ejecutarAgente(mensaje, despachadorHerramientas)

    return NextResponse.json({ exito: true, datos: respuesta })
  } catch (error) {
    console.error('[api/agente/analizar] Error al analizar anomalía', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
