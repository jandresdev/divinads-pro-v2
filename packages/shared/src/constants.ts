// ============================================
// CONSTANTES GLOBALES DE DivinADS
// ============================================

// Umbral de auto-ejecución (en centavos USD: $100.00 = 10000)
export const UMBRAL_AUTO_EJECUCION_CENTAVOS = 10_000

// Severidad mínima para disparar análisis del agente
export const SEVERIDAD_MINIMA_ANALISIS = 70

// Confianza mínima para recomendar una acción
export const CONFIANZA_MINIMA_RECOMENDACION = 75

// Intervalo de sincronización de datos Meta (en ms = 15 minutos)
export const INTERVALO_SINCRONIZACION_MS = 15 * 60 * 1000

// Horas de validación post-acción
export const HORAS_VALIDACION_POST_ACCION = 48

// Máximo de opciones que el agente presenta
export const MAX_OPCIONES_AGENTE = 3

// Planes de suscripción
export const PLANES = {
  gratuito: {
    nombre: 'Gratis',
    precio: 0,
    campañasMax: 5,
    tenantMax: 1,
  },
  pro: {
    nombre: 'Pro',
    precio: 99,
    campañasMax: 50,
    tenantMax: 3,
  },
  enterprise: {
    nombre: 'Enterprise',
    precio: 299,
    campañasMax: -1, // sin límite
    tenantMax: -1,   // sin límite
  },
} as const

// Tipos de campaña con etiquetas en español
export const ETIQUETAS_TIPO_CAMPAÑA = {
  PROSPECCIÓN: 'Prospección',
  REMARKETING: 'Remarketing',
  RETARGETING: 'Retargeting',
  CONVERSIONES: 'Conversiones',
  AWARENESS: 'Awareness',
  OTRO: 'Otro',
} as const

// Colores por tipo de campaña (para gráficos)
export const COLORES_TIPO_CAMPAÑA = {
  PROSPECCIÓN: '#6366f1',   // índigo
  REMARKETING: '#8b5cf6',   // violeta
  RETARGETING: '#06b6d4',   // cian
  CONVERSIONES: '#10b981',  // verde
  AWARENESS: '#f59e0b',     // ámbar
  OTRO: '#6b7280',          // gris
} as const

// Colores de métricas para gráficos
export const COLORES_METRICAS = {
  gasto: '#6366f1',        // índigo (azul)
  roas: '#8b5cf6',         // violeta (púrpura)
  conversiones: '#10b981', // verde
  ctr: '#06b6d4',          // cian
  cpc: '#f59e0b',          // ámbar
} as const
