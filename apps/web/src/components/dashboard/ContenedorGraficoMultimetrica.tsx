// Server Component — obtiene datos de daily_metrics y los pasa al gráfico cliente
// Fallback automático a datos demo si Supabase no devuelve filas

import { subDays, format } from 'date-fns'
import { es } from 'date-fns/locale'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import GraficoMultimetrica from './GraficoMultimetrica'

// ─── Datos demo ───────────────────────────────────────────────────────────────

function generarDatosDemo30Dias(): DatoPunto[] {
  const hoy = new Date()
  return Array.from({ length: 30 }, (_, i) => {
    const fecha = subDays(hoy, 29 - i)
    const variabilidad = 0.85 + Math.random() * 0.3
    return {
      fecha: format(fecha, 'dd/MM', { locale: es }),
      gasto: Math.round(1200 * variabilidad * 100) / 100,
      roas: Math.round(4.2 * variabilidad * 10) / 10,
      conversiones: Math.round(42 * variabilidad),
    }
  })
}

// Estructura que espera el gráfico cliente
interface DatoPunto {
  fecha: string        // "dd/MM" — ej. "24/05"
  gasto: number        // USD (convertido desde centavos)
  roas: number         // multiplicador, ej. 4.2
  conversiones: number // entero
}

/**
 * Obtiene los últimos 30 días de métricas desde Supabase.
 * Si no hay sesión, no hay datos o falla la consulta, retorna datos demo.
 */
async function obtenerDatosGrafico(): Promise<DatoPunto[]> {
  try {
    const supabase = await crearClienteServidor()

    // Verificar autenticación — sin sesión no hay datos del tenant
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return generarDatosDemo30Dias()

    // Consultar últimas 30 fechas con datos del tenant (RLS filtra automáticamente)
    const { data: metricas, error } = await supabase
      .from('daily_metrics')
      .select('fecha, gasto_centavos, roas, conversiones')
      .order('fecha', { ascending: true })
      .limit(30)

    // Sin datos o con error → caer silenciosamente a demo
    if (error || !metricas || metricas.length === 0) {
      return generarDatosDemo30Dias()
    }

    // Mapear filas de Supabase al formato que espera el gráfico
    const datos: DatoPunto[] = metricas.map((m) => ({
      fecha: format(new Date(m.fecha), 'dd/MM', { locale: es }),
      gasto: (m.gasto_centavos ?? 0) / 100,
      roas: m.roas ?? 0,
      conversiones: m.conversiones ?? 0,
    }))

    return datos
  } catch {
    // Cualquier excepción inesperada → datos demo para no romper la UI
    return generarDatosDemo30Dias()
  }
}

/**
 * Contenedor server-side del gráfico multi-métrica.
 * Resuelve los datos antes de pasar al componente cliente.
 */
export default async function ContenedorGraficoMultimetrica() {
  const datos = await obtenerDatosGrafico()

  return <GraficoMultimetrica datos={datos} />
}
