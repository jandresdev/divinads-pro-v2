// Server Component — Página de Campañas con datos reales desde Supabase
import { crearClienteServidor } from '@/lib/supabase/servidor'
import PaginaCampaniasCliente from './PaginaCampaniasCliente'
import type { DatoCampaña } from '@/components/dashboard/TablaCampañas'

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

async function obtenerTodasLasCampañas(): Promise<DatoCampaña[]> {
  try {
    const supabase = await crearClienteServidor()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

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

    if (error || !filas || filas.length === 0) return []

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

    return campañas
  } catch {
    return []
  }
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function PaginaCampanias() {
  const campañas = await obtenerTodasLasCampañas()
  return <PaginaCampaniasCliente campañas={campañas} />
}
