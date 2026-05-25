import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado } from '@/lib/api/autenticar'
import { ejecutarAccion, TipoAccionEjecutable } from '@/lib/services/ejecutor-acciones'

// POST /api/agente/aprobar-accion — aprobar o rechazar una acción recomendada
export async function POST(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    const body = await req.json()
    const { accionId, aprobada } = body

    // Validar parámetros obligatorios
    if (!accionId || aprobada === undefined) {
      return NextResponse.json(
        { exito: false, error: 'Se requiere accionId y aprobada (boolean)' },
        { status: 400 }
      )
    }

    // Obtener la acción verificando que pertenezca al tenant autenticado
    const { data: accion } = await usuario.supabase
      .from('agent_actions')
      .select('*')
      .eq('id', accionId)
      .eq('tenant_id', usuario.tenantId)
      .single()

    if (!accion) {
      return NextResponse.json({ exito: false, error: 'Acción no encontrada' }, { status: 404 })
    }

    // -----------------------------------------------------------------------
    // Caso: el usuario rechazó la acción — registrar y finalizar
    // -----------------------------------------------------------------------
    if (!aprobada) {
      await usuario.supabase
        .from('agent_actions')
        .update({
          estado: 'rechazada',
          updated_at: new Date().toISOString(),
        })
        .eq('id', accionId)

      return NextResponse.json({ exito: true, mensaje: 'Acción rechazada por el usuario.' })
    }

    // -----------------------------------------------------------------------
    // Caso: el usuario aprobó la acción — ejecutar en Meta Ads
    // -----------------------------------------------------------------------
    const resultado = await ejecutarAccion(
      usuario.tenantId,
      accion.campaign_id,
      accion.tipo_accion as TipoAccionEjecutable,
      (accion.parametros_accion as Record<string, unknown>) ?? {}
    )

    // Actualizar el estado de la acción según el resultado de la ejecución
    await usuario.supabase
      .from('agent_actions')
      .update({
        estado: resultado.exitoso ? 'ejecutada' : 'error_ejecucion',
        ejecutada_at: resultado.exitoso ? new Date().toISOString() : null,
        resultado_ejecucion: resultado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accionId)

    return NextResponse.json({ exito: true, datos: resultado })
  } catch (error) {
    console.error('[api/agente/aprobar-accion] Error al aprobar acción', error)
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
