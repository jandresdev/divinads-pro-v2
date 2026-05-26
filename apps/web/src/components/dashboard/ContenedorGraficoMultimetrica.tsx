// Server Component — obtiene datos de daily_metrics y los pasa al gráfico cliente

import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import GraficoMultimetrica from './GraficoMultimetrica'

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
async function obtenerDatosGrafico(diasPeriodo: number): Promise<DatoPunto[]> {
  try {
    const supabase = await crearClienteServidor()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const fechaDesde = new Date(Date.now() - diasPeriodo * 86_400_000).toISOString().split('T')[0]

    // Consultar el período seleccionado con datos del tenant (RLS filtra automáticamente)
    // Nota: puede haber múltiples campañas con la misma fecha, se agregan por fecha
    const { data: metricas, error } = await supabase
      .from('daily_metrics')
      .select('fecha, gasto_centavos, roas, conversiones, ingresos_centavos')
      .gte('fecha', fechaDesde)
      .order('fecha', { ascending: true })
      .limit((diasPeriodo + 5) * 10) // x10 para soportar múltiples campañas por día

    if (error || !metricas || metricas.length === 0) return []

    // Agregar métricas por fecha (sumar gasto/conversiones, ponderar ROAS por gasto)
    const porFecha = new Map<string, { gastoCentavos: number; ingresosCentavos: number; conversiones: number }>()
    for (const m of metricas) {
      const f = m.fecha as string
      const prev = porFecha.get(f) ?? { gastoCentavos: 0, ingresosCentavos: 0, conversiones: 0 }
      porFecha.set(f, {
        gastoCentavos:   prev.gastoCentavos   + (m.gasto_centavos ?? 0),
        ingresosCentavos: prev.ingresosCentavos + (m.ingresos_centavos ?? 0),
        conversiones:    prev.conversiones    + (m.conversiones ?? 0),
      })
    }

    // Convertir a puntos de gráfico — ROAS = ingresos / gasto
    const datos: DatoPunto[] = Array.from(porFecha.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, agg]) => ({
        fecha: format(new Date(fecha), 'dd/MM', { locale: es }),
        gasto: agg.gastoCentavos / 100,
        roas:  agg.gastoCentavos > 0 ? agg.ingresosCentavos / agg.gastoCentavos : 0,
        conversiones: agg.conversiones,
      }))

    return datos
  } catch {
    return []
  }
}

/**
 * Contenedor server-side del gráfico multi-métrica.
 * Resuelve los datos antes de pasar al componente cliente.
 */
export default async function ContenedorGraficoMultimetrica({ diasPeriodo = 30 }: { diasPeriodo?: number }) {
  const datos = await obtenerDatosGrafico(diasPeriodo)

  return <GraficoMultimetrica datos={datos} />
}
