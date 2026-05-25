// ---------------------------------------------------------------------------
// Job de detección de anomalías para DivinADS
// Aplica el motor de reglas a todos los feature snapshots recientes
// y persiste los resultados en la tabla `anomalies` de Supabase
// ---------------------------------------------------------------------------

import { supabaseAdmin } from '@/lib/api/autenticar'
import { detectarAnomalias, AnomaliaDetectada, TipoAnomalia } from '@/lib/services/detector-anomalias'

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

// Fila de anomalía activa ya almacenada en Supabase
interface AnomaliaExistente {
  id: string
  tipo: TipoAnomalia
  activa: boolean
}

// Fila de feature snapshot obtenida desde Supabase (con join a campaigns)
interface FeatureSnapshot {
  tenant_id:   string
  campaign_id: string
  features:    Record<string, number>
  campaigns:   { nombre: string } | null
}

// ---------------------------------------------------------------------------
// Lógica de persistencia
// ---------------------------------------------------------------------------

/**
 * Persistir las anomalías detectadas para una campaña concreta.
 *
 * Comportamiento:
 *   1. Obtener anomalías activas existentes para el par (tenant, campaign)
 *   2. Desactivar las que ya no se detectaron en esta ejecución
 *   3. Actualizar severidad y títulos de las que persisten
 *   4. Insertar las nuevas que no existían previamente
 */
async function persistirAnomalias(
  anomaliasDetectadas: AnomaliaDetectada[],
  campaignId: string,
  tenantId: string
): Promise<{ creadas: number; actualizadas: number; desactivadas: number }> {
  const resultado = { creadas: 0, actualizadas: 0, desactivadas: 0 }

  // Obtener todas las anomalías activas de esta campaña en una sola query
  const { data: existentes, error: errorConsulta } = await supabaseAdmin
    .from('anomalies')
    .select('id, tipo, activa')
    .eq('tenant_id', tenantId)
    .eq('campaign_id', campaignId)
    .eq('activa', true)

  if (errorConsulta) {
    console.warn(`[detectar-anomalias] Error consultando anomalías existentes — se omite persistencia para esta campaña: tenant=${tenantId} campaign=${campaignId}`, errorConsulta.message)
    return resultado
  }

  const anomaliasExistentes = (existentes ?? []) as AnomaliaExistente[]

  // Conjuntos para comparar tipos detectados vs tipos activos en BD
  const tiposDetectados = new Set(anomaliasDetectadas.map(a => a.tipo))
  const tiposExistentes = new Set(anomaliasExistentes.map(a => a.tipo))

  // -------------------------------------------------------------------------
  // Paso 1: Desactivar anomalías que ya no se detectan en esta ejecución
  // -------------------------------------------------------------------------
  for (const existente of anomaliasExistentes) {
    if (!tiposDetectados.has(existente.tipo)) {
      const { error } = await supabaseAdmin
        .from('anomalies')
        .update({
          activa:     false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existente.id)

      if (error) {
        console.warn(`[detectar-anomalias] Error desactivando anomalía resuelta: anomaliaId=${existente.id} tipo=${existente.tipo}`, error.message)
      } else {
        resultado.desactivadas++
        console.debug(`[detectar-anomalias] Anomalía marcada como resuelta (inactiva): tenant=${tenantId} campaign=${campaignId} tipo=${existente.tipo}`)
      }
    }
  }

  // -------------------------------------------------------------------------
  // Paso 2: Procesar anomalías detectadas — insertar nuevas o actualizar existentes
  // -------------------------------------------------------------------------
  for (const anomalia of anomaliasDetectadas) {
    if (tiposExistentes.has(anomalia.tipo)) {
      // Anomalía ya existe y sigue activa → actualizar severidad y descripción
      const { error } = await supabaseAdmin
        .from('anomalies')
        .update({
          severidad_score: anomalia.severidadScore,
          titulo:          anomalia.titulo,
          descripcion:     anomalia.descripcion,
          updated_at:      new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .eq('campaign_id', campaignId)
        .eq('tipo', anomalia.tipo)
        .eq('activa', true)

      if (error) {
        console.warn(`[detectar-anomalias] Error actualizando anomalía existente: tenant=${tenantId} campaign=${campaignId} tipo=${anomalia.tipo}`, error.message)
      } else {
        resultado.actualizadas++
      }
    } else {
      // Anomalía nueva — insertar en Supabase con estado activo y no revisada
      const { error } = await supabaseAdmin
        .from('anomalies')
        .insert({
          tenant_id:       tenantId,
          campaign_id:     campaignId,
          tipo:            anomalia.tipo,
          severidad_score: anomalia.severidadScore,
          titulo:          anomalia.titulo,
          descripcion:     anomalia.descripcion,
          activa:          true,
          revisada:        false,
        })

      if (error) {
        console.warn(`[detectar-anomalias] Error insertando nueva anomalía: tenant=${tenantId} campaign=${campaignId} tipo=${anomalia.tipo}`, error.message)
      } else {
        resultado.creadas++
        console.debug(`[detectar-anomalias] Nueva anomalía insertada: tenant=${tenantId} campaign=${campaignId} tipo=${anomalia.tipo} severidad=${anomalia.severidadScore}`)
      }
    }
  }

  return resultado
}

// ---------------------------------------------------------------------------
// Job principal
// ---------------------------------------------------------------------------

/**
 * Job principal de detección de anomalías.
 *
 * Flujo de ejecución:
 *   1. Obtener feature snapshots actualizados en las últimas 24 horas
 *   2. Para cada snapshot, aplicar el motor de reglas (función pura)
 *   3. Persistir resultados: desactivar resueltas, actualizar activas, crear nuevas
 */
export async function jobDetectarAnomalias(): Promise<void> {
  console.info('[detectar-anomalias] Iniciando detección de anomalías para todos los tenants')
  const inicio = Date.now()

  // Ventana temporal: snapshots actualizados en las últimas 24 horas
  const fechaLimite = new Date()
  fechaLimite.setHours(fechaLimite.getHours() - 24)

  // Obtener snapshots recientes con join a campaigns para el nombre
  const { data: snapshots, error: errorConsulta } = await supabaseAdmin
    .from('feature_snapshots')
    .select('tenant_id, campaign_id, features, campaigns(nombre)')
    .gte('updated_at', fechaLimite.toISOString())

  if (errorConsulta) {
    console.error('[detectar-anomalias] Error obteniendo feature snapshots — abortando job de detección', errorConsulta.message)
    return
  }

  if (!snapshots?.length) {
    console.info('[detectar-anomalias] No hay feature snapshots recientes — nada que analizar en detección de anomalías')
    return
  }

  // Contadores globales del job para el log final
  let totalAnomaliasCreadas     = 0
  let totalAnomaliasActualizadas = 0
  let totalAnomaliasDesactivadas = 0
  let campañasConError           = 0

  for (const snapshot of snapshots as FeatureSnapshot[]) {
    // Extraer nombre de campaña desde el join (puede ser null si la relación falló)
    const nombreCampaña = snapshot.campaigns?.nombre ?? 'Campaña sin nombre'
    const features      = (snapshot.features as Record<string, number>) ?? {}

    try {
      // Aplicar motor de reglas (función pura — no puede fallar por datos)
      const anomaliasDetectadas = detectarAnomalias(
        snapshot.tenant_id,
        snapshot.campaign_id,
        nombreCampaña,
        features
      )

      // Persistir resultados en Supabase
      const contadores = await persistirAnomalias(
        anomaliasDetectadas,
        snapshot.campaign_id,
        snapshot.tenant_id
      )

      totalAnomaliasCreadas      += contadores.creadas
      totalAnomaliasActualizadas += contadores.actualizadas
      totalAnomaliasDesactivadas += contadores.desactivadas

    } catch (error) {
      // Captura de seguridad — si algo falla inesperadamente, continuar con la siguiente
      campañasConError++
      console.error(`[detectar-anomalias] Error inesperado procesando anomalías para campaña — continuando con la siguiente: tenant=${snapshot.tenant_id} campaign=${snapshot.campaign_id}`, error)
    }
  }

  console.info(`[detectar-anomalias] Detección de anomalías completada: totalSnapshots=${snapshots.length} anomaliasCreadas=${totalAnomaliasCreadas} anomaliasActualizadas=${totalAnomaliasActualizadas} anomaliasDesactivadas=${totalAnomaliasDesactivadas} campañasConError=${campañasConError} duracionMs=${Date.now() - inicio}`)
}
