// Server Component — Página de Campañas con datos reales desde Supabase
import { crearClienteServidor } from '@/lib/supabase/servidor'
import PaginaCampaniasCliente from './PaginaCampaniasCliente'
import type { DatoCampaña } from '@/components/dashboard/TablaCampañas'

// ─── Datos demo ───────────────────────────────────────────────────────────────

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
  {
    id: '7',
    nombre: 'Prospección - Segmento Premium',
    tipo: 'Prospección',
    estado: 'activa',
    gasto: 1_872.50,
    roas: 3.7,
    ctr: 2.9,
    conversiones: 56,
    cpa: 33.44,
  },
  {
    id: '8',
    nombre: 'Retargeting - Video 75%',
    tipo: 'Retargeting',
    estado: 'pausada',
    gasto: 1_340.00,
    roas: 1.8,
    ctr: 4.2,
    conversiones: 31,
    cpa: 43.23,
  },
]

// ─── Tipos de fila Supabase ───────────────────────────────────────────────────

interface FilaMetrica {
  gasto_centavos?: number | null
  roas?: number | null
  ctr?: number | null
  conversiones?: number | null
  cpa?: number | null
  fecha?: string | null
}

interface FilaCampaña {
  id: string
  nombre: string | null
  tipo_campaña: string | null
  estado: string | null
  daily_metrics: FilaMetrica[] | FilaMetrica | null
}

// ─── Obtención de datos ───────────────────────────────────────────────────────

/**
 * Consulta todas las campañas del tenant con métricas agregadas de los últimos 30 días.
 * Fallback a datos demo ante cualquier error o falta de sesión.
 */
async function obtenerTodasLasCampañas(): Promise<DatoCampaña[]> {
  try {
    const supabase = await crearClienteServidor()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return DEMO_CAMPAÑAS

    const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

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
      .limit(100)

    if (error || !filas || filas.length === 0) return DEMO_CAMPAÑAS

    // Transformar y agregar métricas de los últimos 30 días por campaña
    const campañas: DatoCampaña[] = (filas as unknown as FilaCampaña[])
      .map((fila) => {
        const todasMetricas: FilaMetrica[] = Array.isArray(fila.daily_metrics)
          ? fila.daily_metrics
          : fila.daily_metrics
          ? [fila.daily_metrics]
          : []

        // Filtrar métricas del período seleccionado
        const metricas = todasMetricas.filter(
          (m) => m.fecha != null && m.fecha >= hace30Dias
        )

        if (metricas.length === 0) return null

        const n = metricas.length

        return {
          id: fila.id,
          nombre: fila.nombre ?? 'Sin nombre',
          tipo: fila.tipo_campaña ?? 'Otro',
          estado: fila.estado === 'pausada' ? 'pausada' : 'activa',
          gasto: metricas.reduce((acc, m) => acc + (m.gasto_centavos ?? 0), 0) / 100,
          roas: metricas.reduce((acc, m) => acc + (m.roas ?? 0), 0) / n,
          ctr: metricas.reduce((acc, m) => acc + (m.ctr ?? 0), 0) / n,
          conversiones: metricas.reduce((acc, m) => acc + (m.conversiones ?? 0), 0),
          cpa: metricas.reduce((acc, m) => acc + (m.cpa ?? 0), 0) / n,
        } satisfies DatoCampaña
      })
      .filter((c): c is DatoCampaña => c !== null)

    return campañas.length > 0 ? campañas : DEMO_CAMPAÑAS
  } catch {
    return DEMO_CAMPAÑAS
  }
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function PaginaCampanias() {
  const campañas = await obtenerTodasLasCampañas()
  return <PaginaCampaniasCliente campañas={campañas} />
}
