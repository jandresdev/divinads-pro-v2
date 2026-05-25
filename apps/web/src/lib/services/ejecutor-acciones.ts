import { supabaseAdmin } from '@/lib/api/autenticar'
import { obtenerClienteMeta } from './meta-accounts-service'

// ---------------------------------------------------------------------------
// Tipos de acciones ejecutables en Meta Ads
// ---------------------------------------------------------------------------

// Tipos de acción que el ejecutor sabe cómo procesar
export type TipoAccionEjecutable =
  | 'pausar_campaña'
  | 'reducir_presupuesto'
  | 'aumentar_presupuesto'
  | 'solo_monitorear'

// Resultado estandarizado que devuelve la ejecución de cualquier acción
interface ResultadoEjecucion {
  // Indica si la acción se ejecutó exitosamente en Meta
  exitoso: boolean
  // Mensaje descriptivo en español para mostrar al usuario
  mensaje: string
  // Datos adicionales del resultado (presupuestos, estados, etc.)
  detalles?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Ejecutor principal de acciones en Meta API
// ---------------------------------------------------------------------------

/**
 * Ejecuta una acción en la API de Meta Ads dado un tenant y campaña.
 * Gestiona todas las acciones ejecutables: pausar, reducir/aumentar presupuesto, monitorear.
 * Nunca lanza excepciones hacia el caller — siempre retorna un ResultadoEjecucion.
 *
 * @param tenantId    - UUID del tenant propietario de la campaña
 * @param campaignId  - UUID de la campaña en Supabase (no el ID de Meta)
 * @param tipoAccion  - Tipo de acción a ejecutar
 * @param parametros  - Parámetros adicionales según el tipo de acción
 */
export async function ejecutarAccion(
  tenantId: string,
  campaignId: string,
  tipoAccion: TipoAccionEjecutable,
  parametros: Record<string, unknown>
): Promise<ResultadoEjecucion> {
  // La acción de solo monitorear no requiere llamada a Meta — finalizar de inmediato
  if (tipoAccion === 'solo_monitorear') {
    console.info(`[ejecutor-acciones] Acción de solo monitoreo registrada — sin cambios en Meta: tenant=${tenantId} campaign=${campaignId}`)
    return {
      exitoso: true,
      mensaje: 'Acción de solo monitoreo registrada — no se realizaron cambios en Meta.',
    }
  }

  // Obtener el cliente Meta autenticado para el tenant
  const clienteMeta = await obtenerClienteMeta(tenantId)
  if (!clienteMeta) {
    console.warn(`[ejecutor-acciones] No hay cuenta Meta configurada para ejecutar la acción: tenant=${tenantId} campaign=${campaignId}`)
    return {
      exitoso: false,
      mensaje: 'No hay cuenta Meta configurada para ejecutar la acción.',
    }
  }

  // Obtener el ID de Meta de la campaña (distinto al UUID de Supabase)
  const { data: campania } = await supabaseAdmin
    .from('campaigns')
    .select('meta_campaign_id')
    .eq('id', campaignId)
    .eq('tenant_id', tenantId)
    .single()

  if (!campania?.meta_campaign_id) {
    console.warn(`[ejecutor-acciones] No se encontró el meta_campaign_id para la campaña: tenant=${tenantId} campaign=${campaignId}`)
    return {
      exitoso: false,
      mensaje: 'No se encontró el ID de Meta para la campaña.',
    }
  }

  try {
    switch (tipoAccion) {

      // -----------------------------------------------------------------------
      // Pausar campaña: detiene la entrega inmediatamente en Meta
      // -----------------------------------------------------------------------
      case 'pausar_campaña': {
        await clienteMeta.actualizarEstadoCampaña(campania.meta_campaign_id, 'PAUSED')

        // Reflejar el nuevo estado en la tabla campaigns de Supabase
        await supabaseAdmin
          .from('campaigns')
          .update({
            estado: 'pausada',
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaignId)

        console.info(`[ejecutor-acciones] Campaña pausada exitosamente en Meta Ads y Supabase: tenant=${tenantId} campaign=${campaignId}`)
        return {
          exitoso: true,
          mensaje: 'Campaña pausada exitosamente en Meta Ads.',
        }
      }

      // -----------------------------------------------------------------------
      // Reducir presupuesto: baja el daily_budget de un AdSet un porcentaje
      // -----------------------------------------------------------------------
      case 'reducir_presupuesto': {
        // Porcentaje de reducción — por defecto 20% si no se especifica
        const reduccionPct = (parametros.reduccionPorcentaje as number) ?? 20
        const adSetId = parametros.adSetId as string | undefined

        if (!adSetId) {
          return {
            exitoso: false,
            mensaje: 'Se requiere adSetId para reducir el presupuesto del AdSet.',
          }
        }

        // Consultar el presupuesto actual almacenado en Supabase
        const { data: datosCampania } = await supabaseAdmin
          .from('campaigns')
          .select('presupuesto_diario_centavos')
          .eq('id', campaignId)
          .single()

        const presupuestoActual = (datosCampania?.presupuesto_diario_centavos as number) ?? 0
        // Calcular el nuevo presupuesto aplicando la reducción porcentual
        const presupuestoNuevo = Math.round(presupuestoActual * (1 - reduccionPct / 100))

        await clienteMeta.actualizarPresupuestoAdSet(adSetId, presupuestoNuevo)

        console.info(`[ejecutor-acciones] Presupuesto de AdSet reducido exitosamente en Meta: tenant=${tenantId} campaign=${campaignId} adSetId=${adSetId} presupuestoActual=${presupuestoActual} presupuestoNuevo=${presupuestoNuevo} reduccionPct=${reduccionPct}`)

        return {
          exitoso: true,
          mensaje: `Presupuesto reducido ${reduccionPct}% exitosamente.`,
          detalles: {
            presupuestoAnterior: presupuestoActual / 100,
            presupuestoNuevo: presupuestoNuevo / 100,
            reduccionPorcentaje: reduccionPct,
          },
        }
      }

      // -----------------------------------------------------------------------
      // Aumentar presupuesto: sube el daily_budget de un AdSet un porcentaje
      // -----------------------------------------------------------------------
      case 'aumentar_presupuesto': {
        // Porcentaje de aumento — por defecto 20% si no se especifica
        const aumentoPct = (parametros.aumentoPorcentaje as number) ?? 20
        const adSetIdAumento = parametros.adSetId as string | undefined

        if (!adSetIdAumento) {
          return {
            exitoso: false,
            mensaje: 'Se requiere adSetId para aumentar el presupuesto del AdSet.',
          }
        }

        // Consultar el presupuesto actual almacenado en Supabase
        const { data: datosCampania2 } = await supabaseAdmin
          .from('campaigns')
          .select('presupuesto_diario_centavos')
          .eq('id', campaignId)
          .single()

        const presupuestoActual2 = (datosCampania2?.presupuesto_diario_centavos as number) ?? 0
        // Calcular el nuevo presupuesto aplicando el aumento porcentual
        const presupuestoNuevo2 = Math.round(presupuestoActual2 * (1 + aumentoPct / 100))

        await clienteMeta.actualizarPresupuestoAdSet(adSetIdAumento, presupuestoNuevo2)

        console.info(`[ejecutor-acciones] Presupuesto de AdSet aumentado exitosamente en Meta: tenant=${tenantId} campaign=${campaignId} adSetId=${adSetIdAumento} aumentoPct=${aumentoPct}`)

        return {
          exitoso: true,
          mensaje: `Presupuesto aumentado ${aumentoPct}% exitosamente.`,
          detalles: {
            presupuestoAnterior: presupuestoActual2 / 100,
            presupuestoNuevo: presupuestoNuevo2 / 100,
            aumentoPorcentaje: aumentoPct,
          },
        }
      }

      // -----------------------------------------------------------------------
      // Tipo de acción desconocido — responder con error sin lanzar excepción
      // -----------------------------------------------------------------------
      default: {
        console.warn(`[ejecutor-acciones] Tipo de acción desconocido recibido: tipoAccion=${tipoAccion} campaign=${campaignId}`)
        return {
          exitoso: false,
          mensaje: `Tipo de acción desconocido: ${tipoAccion}`,
        }
      }
    }
  } catch (error) {
    // Capturar cualquier error de la API de Meta o de Supabase para retornar gracefully
    const mensajeError = error instanceof Error ? error.message : 'Error desconocido'
    console.error(`[ejecutor-acciones] Error al ejecutar acción en Meta API: tipoAccion=${tipoAccion} campaign=${campaignId} tenant=${tenantId}`, error)
    return {
      exitoso: false,
      mensaje: `Error al ejecutar en Meta: ${mensajeError}`,
    }
  }
}
