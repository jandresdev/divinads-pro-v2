// Server Component — obtiene distribución de presupuesto por tipo de campaña
// desde Supabase y lo pasa al gráfico cliente. Fallback silencioso a demo.

import { crearClienteServidor } from '@/lib/supabase/servidor'
import GraficoPresupuesto, {
  type SegmentoPresupuesto,
} from './GraficoPresupuesto'

// ─── Colores por tipo de campaña ──────────────────────────────────────────────

// Mapa de colores para tipos de campaña conocidos
const COLORES_TIPO: Record<string, string> = {
  Prospección: '#6366f1',
  Remarketing:  '#8b5cf6',
  Retargeting:  '#06b6d4',
  Conversión:   '#10b981',
}

// Color por defecto para tipos de campaña no catalogados
const COLOR_FALLBACK = '#94a3b8'

// ─── Función de obtención de datos ───────────────────────────────────────────

interface DatosPresupuesto {
  total: number
  distribución: SegmentoPresupuesto[]
}

/**
 * Consulta Supabase para agrupar el gasto de los últimos 30 días
 * por tipo de campaña. Retorna datos demo ante cualquier fallo.
 */
async function obtenerDistribucion(): Promise<DatosPresupuesto> {
  try {
    const supabase = await crearClienteServidor()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { total: 0, distribución: [] }

    // Fecha de inicio: hace 30 días en formato ISO
    const hace30Dias = new Date()
    hace30Dias.setDate(hace30Dias.getDate() - 30)
    const fechaInicio = hace30Dias.toISOString().split('T')[0]

    // Obtener campañas con sus métricas diarias de los últimos 30 días
    const { data: campañas, error } = await supabase
      .from('campaigns')
      .select(`
        tipo_campaña,
        daily_metrics (
          gasto_centavos,
          fecha
        )
      `)
      .gte('daily_metrics.fecha', fechaInicio)

    if (error || !campañas || campañas.length === 0) return { total: 0, distribución: [] }

    // Acumular gasto por tipo de campaña
    const gastoPorTipo: Record<string, number> = {}
    let totalCentavos = 0

    type FilaPresupuesto = { tipo_campaña?: string | null; daily_metrics: { gasto_centavos?: number; fecha: string }[] }
    for (const campaña of campañas as unknown as FilaPresupuesto[]) {
      const tipo = campaña.tipo_campaña ?? 'Otro'
      const metricas = Array.isArray(campaña.daily_metrics)
        ? campaña.daily_metrics
        : []

      for (const m of metricas) {
        const gasto = (m as { gasto_centavos?: number }).gasto_centavos ?? 0
        gastoPorTipo[tipo] = (gastoPorTipo[tipo] ?? 0) + gasto
        totalCentavos += gasto
      }
    }

    if (totalCentavos === 0) return { total: 0, distribución: [] }

    // Convertir a USD y calcular porcentajes
    const totalUSD = totalCentavos / 100
    const distribución: SegmentoPresupuesto[] = Object.entries(gastoPorTipo)
      .sort((a, b) => b[1] - a[1])  // ordenar de mayor a menor
      .map(([tipo, centavos]) => ({
        tipo,
        color: COLORES_TIPO[tipo] ?? COLOR_FALLBACK,
        monto: centavos / 100,
        porcentaje: Math.round((centavos / totalCentavos) * 100),
      }))

    return { total: totalUSD, distribución }
  } catch {
    return { total: 0, distribución: [] }
  }
}

// ─── Componente servidor ──────────────────────────────────────────────────────

/**
 * Resuelve los datos de presupuesto y renderiza el gráfico de dona.
 */
export default async function ContenedorPresupuesto() {
  const { total, distribución } = await obtenerDistribucion()

  return <GraficoPresupuesto total={total} distribución={distribución} />
}
