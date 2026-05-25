// Server Component — resuelve datos de campañas desde Supabase
// y los pasa al componente cliente TablaCampañas.
// Fallback silencioso a datos demo ante cualquier error.

import { crearClienteServidor } from '@/lib/supabase/servidor'
import TablaCampañas, { type DatoCampaña } from './TablaCampañas'

// ─── Datos demo ───────────────────────────────────────────────────────────────

// Se usan cuando no hay sesión activa o Supabase no devuelve datos válidos
const DEMO_CAMPAÑAS: DatoCampaña[] = [
  {
    id: '1',
    nombre: 'Prospección - Lookalike 2%',
    tipo: 'Prospección',
    estado: 'activa',
    gasto: 12_450.30,
    roas: 4.8,
    ctr: 3.2,
    conversiones: 312,
    cpa: 39.90,
  },
  {
    id: '2',
    nombre: 'Remarketing - Visitantes 30d',
    tipo: 'Remarketing',
    estado: 'activa',
    gasto: 8_932.15,
    roas: 6.2,
    ctr: 5.1,
    conversiones: 248,
    cpa: 36.02,
  },
  {
    id: '3',
    nombre: 'Retargeting - Carrito Abandonado',
    tipo: 'Retargeting',
    estado: 'activa',
    gasto: 6_214.80,
    roas: 8.4,
    ctr: 7.3,
    conversiones: 187,
    cpa: 33.24,
  },
  {
    id: '4',
    nombre: 'Prospección - Intereses Fitness',
    tipo: 'Prospección',
    estado: 'pausada',
    gasto: 5_890.25,
    roas: 2.1,
    ctr: 1.8,
    conversiones: 143,
    cpa: 41.19,
  },
  {
    id: '5',
    nombre: 'Conversión - DABA Catálogo',
    tipo: 'Conversión',
    estado: 'activa',
    gasto: 3_241.70,
    roas: 5.3,
    ctr: 4.6,
    conversiones: 98,
    cpa: 33.08,
  },
  {
    id: '6',
    nombre: 'Remarketing - Compradores 90d',
    tipo: 'Remarketing',
    estado: 'activa',
    gasto: 2_243.25,
    roas: 9.1,
    ctr: 6.8,
    conversiones: 74,
    cpa: 30.31,
  },
]

// ─── Tipos internos de Supabase ───────────────────────────────────────────────

// Forma esperada de cada fila de daily_metrics al hacer el join
interface FilaMetrica {
  gasto_centavos?: number | null
  roas?: number | null
  ctr?: number | null
  conversiones?: number | null
  cpa?: number | null
  fecha?: string | null
}

// Forma esperada de cada campaña con sus métricas anidadas
interface FilaCampaña {
  id: string
  nombre: string
  tipo_campaña: string | null
  estado: string | null
  daily_metrics: FilaMetrica[] | FilaMetrica | null
}

// ─── Función de obtención de datos ───────────────────────────────────────────

/**
 * Consulta Supabase para obtener las campañas y su métrica más reciente.
 * Para cada campaña se toma el registro de daily_metrics con la fecha más alta.
 * Retorna datos demo ante cualquier fallo o falta de sesión.
 */
async function obtenerCampañas(): Promise<DatoCampaña[]> {
  try {
    const supabase = await crearClienteServidor()

    // Sin sesión activa → datos demo para evitar consultas sin contexto de tenant
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return DEMO_CAMPAÑAS

    // Consulta con join a daily_metrics — se toman todas las métricas y luego
    // se filtra la más reciente en memoria para máxima compatibilidad
    const { data: filas, error } = await supabase
      .from('campaigns')
      .select(`
        id,
        nombre,
        tipo_campaña,
        estado,
        daily_metrics (
          gasto_centavos,
          roas,
          ctr,
          conversiones,
          cpa,
          fecha
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    // Error de Supabase o respuesta vacía → datos demo
    if (error || !filas || filas.length === 0) return DEMO_CAMPAÑAS

    // Transformar filas al formato que espera TablaCampañas
    const campañas: DatoCampaña[] = (filas as unknown as FilaCampaña[])
      .map((fila) => {
        // Normalizar daily_metrics a array
        const metricas: FilaMetrica[] = Array.isArray(fila.daily_metrics)
          ? fila.daily_metrics
          : fila.daily_metrics
            ? [fila.daily_metrics]
            : []

        // Tomar la métrica del día más reciente disponible
        const metricaReciente = metricas
          .filter((m) => m.fecha != null)
          .sort((a, b) =>
            (b.fecha ?? '').localeCompare(a.fecha ?? '')
          )[0] ?? metricas[0]

        // Sin métricas disponibles → omitir campaña del resultado
        if (!metricaReciente) return null

        return {
          id: fila.id,
          nombre: fila.nombre ?? 'Sin nombre',
          tipo: fila.tipo_campaña ?? 'Otro',
          estado: fila.estado === 'pausada' ? 'pausada' : 'activa',
          gasto: (metricaReciente.gasto_centavos ?? 0) / 100,
          roas: metricaReciente.roas ?? 0,
          ctr: metricaReciente.ctr ?? 0,
          conversiones: metricaReciente.conversiones ?? 0,
          cpa: metricaReciente.cpa ?? 0,
        } satisfies DatoCampaña
      })
      .filter((c): c is DatoCampaña => c !== null)

    // Si no se pudo construir ninguna campaña válida → datos demo
    return campañas.length > 0 ? campañas : DEMO_CAMPAÑAS
  } catch {
    // Cualquier excepción no esperada → datos demo, sin romper la UI
    return DEMO_CAMPAÑAS
  }
}

// ─── Componente servidor ──────────────────────────────────────────────────────

/**
 * Resuelve los datos de campañas y renderiza la tabla cliente.
 */
export default async function ContenedorTablaCampañas() {
  const campañas = await obtenerCampañas()

  return <TablaCampañas campañas={campañas} />
}
