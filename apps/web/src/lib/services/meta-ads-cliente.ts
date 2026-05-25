import axios, { AxiosInstance, AxiosError } from 'axios'

// URL base de la API de Meta Marketing
const META_API_BASE = 'https://graph.facebook.com'
const META_API_VERSION = process.env.META_API_VERSION || 'v20.0'

// ---------------------------------------------------------------------------
// Tipos de la API de Meta
// ---------------------------------------------------------------------------

// Representa una campaña de Meta Ads
export interface MetaCampaña {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  objective: string
  daily_budget?: string    // presupuesto diario en centavos (como string)
  lifetime_budget?: string // presupuesto total en centavos (como string)
  start_time?: string
  stop_time?: string
  created_time: string
}

// Métricas (insights) de una campaña o cuenta
export interface MetaInsight {
  campaign_id?: string
  adset_id?: string
  date_start: string
  date_stop: string
  spend: string           // gasto en USD como string: "38.52"
  impressions: string
  clicks: string
  ctr: string             // porcentaje como string: "2.3456"
  cpc: string             // costo por click en USD como string
  cpm: string             // costo por mil impresiones
  reach: string
  frequency: string
  // Acciones (conversiones, etc.) — array de tipo/valor
  actions?: { action_type: string; value: string }[]
  // Costo por cada tipo de acción
  cost_per_action_type?: { action_type: string; value: string }[]
  // ROAS de compra
  purchase_roas?: { action_type: string; value: string }[]
}

// Respuesta paginada estándar de Meta Graph API
export interface MetaRespuestaPaginada<T> {
  data: T[]
  paging?: {
    cursors?: { before: string; after: string }
    next?: string
  }
}

// ---------------------------------------------------------------------------
// Clase de error específica para errores devueltos por Meta API
// ---------------------------------------------------------------------------
export class ErrorMetaAPI extends Error {
  public readonly codigoMeta: number
  public readonly tipo: string
  public readonly traceId: string

  constructor(mensaje: string, codigoMeta: number, tipo: string, traceId: string) {
    super(mensaje)
    this.name = 'ErrorMetaAPI'
    this.codigoMeta = codigoMeta
    this.tipo = tipo
    this.traceId = traceId
  }

  // El token de acceso expiró o es inválido (código 190)
  get esTokenExpirado(): boolean {
    return this.codigoMeta === 190
  }

  // El token no tiene los permisos necesarios (código 200)
  get esErrorPermisos(): boolean {
    return this.codigoMeta === 200
  }
}

// ---------------------------------------------------------------------------
// Cliente principal de Meta Ads API
// Se instancia por request — no guarda estado global
// ---------------------------------------------------------------------------
export class ClienteMetaAds {
  private readonly http: AxiosInstance
  private readonly accessToken: string
  private readonly adAccountId: string

  constructor(accessToken: string, adAccountId: string) {
    this.accessToken = accessToken
    // Meta requiere el prefijo "act_" en el ID de cuenta publicitaria
    this.adAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`

    this.http = axios.create({
      baseURL: `${META_API_BASE}/${META_API_VERSION}`,
      timeout: 30000, // 30 segundos — las consultas de insights pueden ser lentas
      params: {
        access_token: accessToken,
      },
    })

    // Interceptor de salida — loguear cada petición que sale hacia Meta
    this.http.interceptors.request.use(config => {
      console.debug(`[meta-ads-cliente] Petición a Meta API: ${config.method?.toUpperCase()} ${config.url}`)
      return config
    })

    // Interceptor de entrada — convertir errores de Meta en ErrorMetaAPI
    this.http.interceptors.response.use(
      respuesta => respuesta,
      (error: AxiosError) => {
        const datos = error.response?.data as {
          error?: {
            message: string
            type: string
            code: number
            fbtrace_id: string
          }
        }

        if (datos?.error) {
          const metaError = datos.error
          console.warn(`[meta-ads-cliente] Error recibido de Meta API: code=${metaError.code} type=${metaError.type} message=${metaError.message} traceId=${metaError.fbtrace_id}`)

          throw new ErrorMetaAPI(
            metaError.message,
            metaError.code,
            metaError.type,
            metaError.fbtrace_id,
          )
        }

        // Error de red u otro error no estructurado de Meta
        throw error
      },
    )
  }

  // -------------------------------------------------------------------------
  // Obtener todas las campañas activas/pausadas de la cuenta publicitaria
  // -------------------------------------------------------------------------
  async obtenerCampañas(): Promise<MetaCampaña[]> {
    // Campos que necesitamos de cada campaña
    const campos = [
      'id', 'name', 'status', 'objective',
      'daily_budget', 'lifetime_budget',
      'start_time', 'stop_time', 'created_time',
    ].join(',')

    const { data } = await this.http.get<MetaRespuestaPaginada<MetaCampaña>>(
      `/${this.adAccountId}/campaigns`,
      {
        params: {
          fields: campos,
          limit: 100,
          // Filtrar solo campañas activas o pausadas (no eliminadas/archivadas)
          filtering: JSON.stringify([
            { field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] },
          ]),
        },
      },
    )

    return data.data
  }

  // -------------------------------------------------------------------------
  // Obtener insights agregados de la cuenta completa para un período
  // -------------------------------------------------------------------------
  async obtenerInsightsAgregados(opciones: {
    fechaInicio: string   // YYYY-MM-DD
    fechaFin: string      // YYYY-MM-DD
    nivel?: 'account' | 'campaign' | 'adset' | 'ad'
  }): Promise<MetaInsight[]> {
    const campos = [
      'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm',
      'reach', 'frequency', 'actions', 'cost_per_action_type', 'purchase_roas',
    ].join(',')

    const { data } = await this.http.get<MetaRespuestaPaginada<MetaInsight>>(
      `/${this.adAccountId}/insights`,
      {
        params: {
          fields: campos,
          // Rango de fechas para la consulta
          time_range: JSON.stringify({ since: opciones.fechaInicio, until: opciones.fechaFin }),
          level: opciones.nivel ?? 'campaign',
          limit: 500,
          time_increment: 1, // un punto de datos por día
        },
      },
    )

    return data.data
  }

  // -------------------------------------------------------------------------
  // Obtener insights de una campaña específica por su ID
  // -------------------------------------------------------------------------
  async obtenerInsightsCampaña(
    campaignId: string,
    opciones: { fechaInicio: string; fechaFin: string },
  ): Promise<MetaInsight[]> {
    const campos = [
      'campaign_id', 'spend', 'impressions', 'clicks', 'ctr', 'cpc',
      'reach', 'frequency', 'actions', 'cost_per_action_type', 'purchase_roas',
    ].join(',')

    const { data } = await this.http.get<MetaRespuestaPaginada<MetaInsight>>(
      `/${campaignId}/insights`,
      {
        params: {
          fields: campos,
          time_range: JSON.stringify({ since: opciones.fechaInicio, until: opciones.fechaFin }),
          time_increment: 1,
        },
      },
    )

    return data.data
  }

  // -------------------------------------------------------------------------
  // Pausar o activar una campaña en Meta
  // -------------------------------------------------------------------------
  async actualizarEstadoCampaña(campaignId: string, estado: 'ACTIVE' | 'PAUSED'): Promise<boolean> {
    const { data } = await this.http.post<{ success: boolean }>(
      `/${campaignId}`,
      null,
      {
        params: { status: estado },
      },
    )

    console.info(`[meta-ads-cliente] Estado de campaña actualizado en Meta: campaignId=${campaignId} estado=${estado}`)
    return data.success
  }

  // -------------------------------------------------------------------------
  // Actualizar el presupuesto diario de un AdSet
  // Meta espera el presupuesto en centavos (entero)
  // -------------------------------------------------------------------------
  async actualizarPresupuestoAdSet(adSetId: string, presupuestoCentavos: number): Promise<boolean> {
    const { data } = await this.http.post<{ success: boolean }>(
      `/${adSetId}`,
      null,
      {
        params: { daily_budget: presupuestoCentavos },
      },
    )

    console.info(`[meta-ads-cliente] Presupuesto de AdSet actualizado en Meta: adSetId=${adSetId} presupuestoCentavos=${presupuestoCentavos}`)
    return data.success
  }
}

// ---------------------------------------------------------------------------
// Helpers para extraer valores de los arrays de acciones de Meta
// Meta devuelve conversiones como: [{ action_type: 'purchase', value: '23' }]
// ---------------------------------------------------------------------------

// Total de conversiones (compras) del período
export function extraerConversiones(actions?: MetaInsight['actions']): number {
  if (!actions) return 0
  const compra = actions.find(
    a => a.action_type === 'purchase' ||
         a.action_type === 'offsite_conversion.fb_pixel_purchase',
  )
  return compra ? parseFloat(compra.value) : 0
}

// CPA (costo por conversión de compra)
export function extraerCPA(costActions?: MetaInsight['cost_per_action_type']): number {
  if (!costActions) return 0
  const compraCPA = costActions.find(
    a => a.action_type === 'purchase' ||
         a.action_type === 'offsite_conversion.fb_pixel_purchase',
  )
  return compraCPA ? parseFloat(compraCPA.value) : 0
}

// ROAS de compra (retorno sobre inversión publicitaria)
export function extraerROAS(purchaseRoas?: MetaInsight['purchase_roas']): number {
  if (!purchaseRoas) return 0
  const roas = purchaseRoas.find(
    a => a.action_type === 'omni_purchase' || a.action_type === 'purchase',
  )
  return roas ? parseFloat(roas.value) : 0
}
