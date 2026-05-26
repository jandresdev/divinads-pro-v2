import { supabaseAdmin } from '@/lib/api/autenticar'
import { ClienteMetaAds, extraerConversiones, extraerCPA, extraerROAS } from '@/lib/services/meta-ads-cliente'
import { format } from 'date-fns'

// ---------------------------------------------------------------------------
// Tipos internos del job de sincronización
// ---------------------------------------------------------------------------

// Resultado de sincronización de un tenant individual
export interface ResultadoSincronizacion {
  tenantId: string
  exitoso: boolean
  campañasSincronizadas: number
  metricasSincronizadas: number
  duracionMs: number
  error?: string
}

// Datos de cuenta Meta que vienen de la tabla meta_accounts
export interface CuentaMeta {
  id: string            // UUID de meta_accounts (FK para campaigns.meta_account_id)
  tenant_id: string
  access_token: string
  meta_account_id: string  // texto "act_XXXXX" para llamadas a Meta API
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Inferir tipo de campaña según el objetivo de Meta
// Los valores deben coincidir exactamente con el CHECK constraint de la BD:
// 'PROSPECCIÓN' | 'REMARKETING' | 'RETARGETING' | 'CONVERSIONES' | 'AWARENESS' | 'OTRO'
function inferirTipoCampaña(objective: string): string {
  const MAPA_OBJETIVOS: Record<string, string> = {
    'OUTCOME_TRAFFIC':        'PROSPECCIÓN',
    'OUTCOME_AWARENESS':      'AWARENESS',
    'OUTCOME_REACH':          'AWARENESS',
    'OUTCOME_ENGAGEMENT':     'REMARKETING',
    'OUTCOME_LEADS':          'CONVERSIONES',
    'OUTCOME_SALES':          'CONVERSIONES',
    'CONVERSIONS':            'CONVERSIONES',
    'PRODUCT_CATALOG_SALES':  'CONVERSIONES',
    'RETARGETING':            'RETARGETING',
    'LINK_CLICKS':            'PROSPECCIÓN',
    'VIDEO_VIEWS':            'AWARENESS',
  }
  return MAPA_OBJETIVOS[objective] ?? 'OTRO'
}

// ---------------------------------------------------------------------------
// Sincronización de campañas
// ---------------------------------------------------------------------------

// Sincronizar las campañas de Meta con la tabla campaigns en Supabase
// metaAccountUuid: UUID de meta_accounts.id (NO el meta_account_id texto de Meta)
async function sincronizarCampañas(
  tenantId: string,
  metaAccountUuid: string,
  campañasMeta: Awaited<ReturnType<ClienteMetaAds['obtenerCampañas']>>,
): Promise<number> {
  let sincronizadas = 0

  for (const campaña of campañasMeta) {
    // Normalizar estado — la BD acepta solo: ACTIVE, PAUSED, ARCHIVED, DELETED
    const estado = ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED'].includes(campaña.status)
      ? campaña.status
      : 'PAUSED'

    const { error } = await supabaseAdmin
      .from('campaigns')
      .upsert(
        {
          tenant_id:                  tenantId,
          meta_account_id:            metaAccountUuid,   // UUID FK, no el texto "act_XXX"
          meta_campaign_id:           campaña.id,
          nombre:                     campaña.name,
          objetivo:                   campaña.objective ?? null,
          estado,
          tipo:                       inferirTipoCampaña(campaña.objective ?? ''),
          presupuesto_diario_centavos: campaña.daily_budget
            ? Math.round(parseInt(campaña.daily_budget) * 100)  // Meta devuelve centavos, but ensure it
            : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'meta_account_id,meta_campaign_id' },
      )

    if (error) {
      // Loguear el error pero continuar con las demás campañas
      console.warn(`[sincronizar-meta] Error sincronizando campaña individual — continuando: tenant=${tenantId} metaCampaignId=${campaña.id}`, error)
    } else {
      sincronizadas++
    }
  }

  return sincronizadas
}

// ---------------------------------------------------------------------------
// Sincronización de métricas diarias
// ---------------------------------------------------------------------------

// Sincronizar métricas del día actual de Meta a la tabla daily_metrics
async function sincronizarMetricas(
  tenantId: string,
  clienteMeta: ClienteMetaAds,
  fecha: string, // YYYY-MM-DD
): Promise<number> {
  // Obtener insights del día actual a nivel de campaña
  const insights = await clienteMeta.obtenerInsightsAgregados({
    fechaInicio: fecha,
    fechaFin:    fecha,
    nivel:       'campaign',
  })

  if (!insights.length) {
    console.info(`[sincronizar-meta] Sin insights de Meta para la fecha — puede ser normal: tenant=${tenantId} fecha=${fecha}`)
    return 0
  }

  let sincronizadas = 0

  for (const insight of insights) {
    if (!insight.campaign_id) continue

    // Buscar el UUID interno de la campaña en Supabase
    const { data: campaña } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('meta_campaign_id', insight.campaign_id)
      .single()

    if (!campaña) {
      // La campaña aún no existe localmente — puede ocurrir en la primera ejecución
      console.warn(`[sincronizar-meta] Campaña no encontrada en BD local — omitir métrica de este ciclo: tenant=${tenantId} metaCampaignId=${insight.campaign_id}`)
      continue
    }

    const gastoCentavos = Math.round(parseFloat(insight.spend || '0') * 100)
    const roas          = extraerROAS(insight.purchase_roas)

    const { error } = await supabaseAdmin
      .from('daily_metrics')
      .upsert(
        {
          tenant_id:       tenantId,
          campaign_id:     campaña.id,
          fecha,
          gasto_centavos:  gastoCentavos,
          // Ingresos = gasto × ROAS (en centavos; se redondea al entero)
          ingresos_centavos: Math.round(gastoCentavos * roas),
          impresiones:     parseInt(insight.impressions || '0'),
          clics:           parseInt(insight.clicks      || '0'),
          ctr:             parseFloat(insight.ctr       || '0'),
          cpc:             parseFloat(insight.cpc       || '0'),
          cpm:             parseFloat(insight.cpm       || '0'),
          alcance:         parseInt(insight.reach       || '0'),
          frecuencia:      parseFloat(insight.frequency || '0'),
          conversiones:    extraerConversiones(insight.actions),
          cpa:             extraerCPA(insight.cost_per_action_type),
          roas,
        },
        { onConflict: 'campaign_id,fecha' },
      )

    if (error) {
      console.warn(`[sincronizar-meta] Error sincronizando métrica individual — continuando: tenant=${tenantId} metaCampaignId=${insight.campaign_id} fecha=${fecha}`, error)
    } else {
      sincronizadas++
    }
  }

  return sincronizadas
}

// ---------------------------------------------------------------------------
// Función principal por tenant
// ---------------------------------------------------------------------------

// Ejecutar sincronización completa para un tenant específico
// Incluye campañas + métricas del día actual
export async function ejecutarSincronizacion(
  tenantId: string,
  accountMeta: { access_token: string; meta_account_id: string; uuid: string },
): Promise<ResultadoSincronizacion> {
  const inicio   = Date.now()
  const fechaHoy = format(new Date(), 'yyyy-MM-dd')

  try {
    const clienteMeta = new ClienteMetaAds(
      accountMeta.access_token,
      accountMeta.meta_account_id,
    )

    // Paso 1: obtener campañas de Meta y sincronizar
    console.info(`[sincronizar-meta] Sincronizando campañas desde Meta API: tenant=${tenantId}`)
    const campañasMeta          = await clienteMeta.obtenerCampañas()
    const campañasSincronizadas = await sincronizarCampañas(
      tenantId,
      accountMeta.uuid,      // UUID de meta_accounts.id (FK para campaigns)
      campañasMeta,
    )

    // Paso 2: sincronizar métricas del día actual
    console.info(`[sincronizar-meta] Sincronizando métricas del día: tenant=${tenantId} fecha=${fechaHoy}`)
    const metricasSincronizadas = await sincronizarMetricas(
      tenantId,
      clienteMeta,
      fechaHoy,
    )

    const duracionMs = Date.now() - inicio

    console.info(`[sincronizar-meta] Sincronización de tenant completada exitosamente: tenant=${tenantId} campañas=${campañasSincronizadas} metricas=${metricasSincronizadas} duracionMs=${duracionMs}`)

    return {
      tenantId,
      exitoso: true,
      campañasSincronizadas,
      metricasSincronizadas,
      duracionMs,
    }
  } catch (error) {
    const duracionMs    = Date.now() - inicio
    const mensajeError  = error instanceof Error ? error.message : String(error)

    console.error(`[sincronizar-meta] Error en sincronización de tenant: tenant=${tenantId} duracionMs=${duracionMs}`, error)

    return {
      tenantId,
      exitoso:               false,
      campañasSincronizadas: 0,
      metricasSincronizadas: 0,
      duracionMs,
      error: mensajeError,
    }
  }
}

// ---------------------------------------------------------------------------
// Job principal — sincronizar TODOS los tenants
// ---------------------------------------------------------------------------

// Número máximo de tenants sincronizados en paralelo
const CONCURRENCIA_MAXIMA = 5

// Job cron: sincroniza todos los tenants con Meta configurado
// Se llama desde Vercel Cron cada 15 minutos
export async function jobSincronizarTodosLosTenants(): Promise<void> {
  console.info('[sincronizar-meta] Iniciando ciclo de sincronización Meta → Supabase para todos los tenants')
  const inicio = Date.now()

  // Obtener todos los tenants con cuenta Meta activa
  const { data: cuentasMeta, error } = await supabaseAdmin
    .from('meta_accounts')
    .select('id, tenant_id, access_token, meta_account_id')
    .eq('activa', true)

  if (error) {
    console.error('[sincronizar-meta] Error al obtener cuentas Meta de Supabase — abortando ciclo', error)
    return
  }

  if (!cuentasMeta?.length) {
    console.info('[sincronizar-meta] No hay tenants con Meta configurado — omitiendo ciclo de sincronización')
    return
  }

  console.info(`[sincronizar-meta] Sincronizando ${cuentasMeta.length} tenant(s)`)

  // Procesar en lotes para no saturar Meta API ni Supabase
  const resultados: ResultadoSincronizacion[] = []

  for (let i = 0; i < (cuentasMeta as CuentaMeta[]).length; i += CONCURRENCIA_MAXIMA) {
    const lote = (cuentasMeta as CuentaMeta[]).slice(i, i + CONCURRENCIA_MAXIMA)

    const resultadosLote = await Promise.allSettled(
      lote.map(cuenta =>
        ejecutarSincronizacion(cuenta.tenant_id, {
          uuid:            cuenta.id,
          access_token:    cuenta.access_token,
          meta_account_id: cuenta.meta_account_id,
        }),
      ),
    )

    resultadosLote.forEach(resultado => {
      if (resultado.status === 'fulfilled') {
        resultados.push(resultado.value)
      } else {
        // Error inesperado — no debería llegar acá porque ejecutarSincronizacion atrapa todo
        console.error('[sincronizar-meta] Sincronización de tenant falló inesperadamente (sin capturar)', resultado.reason)
      }
    })
  }

  // Resumen del ciclo completo
  const exitosos                 = resultados.filter(r => r.exitoso).length
  const fallidos                 = resultados.filter(r => !r.exitoso).length
  const duracionTotalMs          = Date.now() - inicio
  const totalMetricasSincronizadas = resultados.reduce((sum, r) => sum + r.metricasSincronizadas, 0)
  const totalCampañasSincronizadas = resultados.reduce((sum, r) => sum + r.campañasSincronizadas, 0)

  console.info(`[sincronizar-meta] Ciclo de sincronización Meta → Supabase completado: exitosos=${exitosos} fallidos=${fallidos} duracionTotalMs=${duracionTotalMs} totalMetricas=${totalMetricasSincronizadas} totalCampañas=${totalCampañasSincronizadas}`)
}
