// ============================================
// TIPOS PRINCIPALES DE DivinADS
// ============================================

// Tipos de plan de suscripción
export type PlanSuscripcion = 'gratuito' | 'pro' | 'enterprise'

// Tipo de rol en el tenant
export type RolMiembro = 'admin' | 'editor' | 'visor'

// Estado de campaña de Meta Ads
export type EstadoCampaña = 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED'

// Tipo de campaña
export type TipoCampaña = 'PROSPECCIÓN' | 'REMARKETING' | 'RETARGETING' | 'CONVERSIONES' | 'AWARENESS' | 'OTRO'

// Severidad de anomalía
export type SeveridadAnomalia = 'baja' | 'media' | 'alta' | 'critica'

// Tipo de anomalía detectada
export type TipoAnomalia =
  | 'caida_roas'
  | 'subida_cpc'
  | 'frecuencia_alta'
  | 'caida_ctr'
  | 'subida_cpm'
  | 'bajo_alcance'

// Estado de una acción del agente
export type EstadoAccion = 'pendiente' | 'aprobada' | 'ejecutada' | 'fallida' | 'revertida' | 'investigando'

// Tipo de acción del agente
export type TipoAccion =
  | 'pausa_campaña'
  | 'escalar_presupuesto'
  | 'reducir_presupuesto'
  | 'reasignar_presupuesto'
  | 'ajustar_puja'
  | 'monitorear'

// ============================================
// INTERFACES PRINCIPALES
// ============================================

export interface KPIMetrica {
  nombre: string
  valor: number
  variacion: number      // % de cambio vs período anterior
  positivo: boolean      // si la variación es positiva o negativa (depende del KPI)
  formato: 'moneda' | 'porcentaje' | 'decimal' | 'numero'
}

export interface MetricasDiarias {
  fecha: string
  gasto: number
  impresiones: number
  clics: number
  conversiones: number
  ingresos: number
  roas: number
  cpc: number
  ctr: number
  frecuencia: number
}

export interface ResumenKPIs {
  gasto: KPIMetrica
  roas: KPIMetrica
  ctr: KPIMetrica
  cpc: KPIMetrica
  conversiones: KPIMetrica
  cpa: KPIMetrica
}

export interface AlertaAnomalia {
  id: string
  tipo: TipoAnomalia
  severidad: SeveridadAnomalia
  campaña: string
  metrica: string
  valorActual: number
  valorBase: number
  cambio: number           // % de cambio
  causaProbable: string
  hora: string
  recomendacion?: string
}

export interface AccionAgente {
  id: string
  tipo: TipoAccion
  estado: EstadoAccion
  campaña: string
  confianza: number        // 0-100
  impactoEstimado: number  // en centavos USD
  requiereAprobacion: boolean
  descripcion: string
  opciones?: OpcionAccion[]
}

export interface OpcionAccion {
  titulo: string
  descripcion: string
  confianza: number
  impactoEstimado: number
  riesgo: 'bajo' | 'medio' | 'alto'
  reversible: boolean
}

export interface MensajeChat {
  id: string
  rol: 'usuario' | 'agente'
  contenido: string
  timestamp: string
  metadata?: Record<string, unknown>
}
