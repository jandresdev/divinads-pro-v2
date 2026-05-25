// Server Component — obtiene métricas KPI de Supabase y las renderiza en grid
import {
  DollarSign,
  TrendingUp,
  MousePointer,
  MousePointerClick,
  ShoppingCart,
  Target,
} from 'lucide-react'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { formatearMoneda, formatearNumero, formatearPorcentaje } from '@/lib/utils'
import { DATOS_DEMO_KPI } from '@/lib/constantes/demo'
import TarjetaKPI from './TarjetaKPI'
import type { Database } from '@/lib/supabase/tipos'

// Fila de la tabla daily_metrics
type FilaMetrica = Database['public']['Tables']['daily_metrics']['Row']

// Estructura normalizada de una métrica KPI con su variación
interface MetricaKPI {
  valor: number
  variacion: number
  periodo: string
}

// Métricas agregadas por fecha (suma de todas las campañas del tenant)
interface MetricasAgregadas {
  gasto: number           // En USD (ya convertido desde centavos)
  roas: number            // Promedio ponderado
  ctr: number             // Promedio ponderado
  cpc: number             // Calculado: gasto / clics
  conversiones: number    // Suma total
  cpa: number             // Calculado: gasto / conversiones
}

// Convierte centavos enteros a USD con 2 decimales
function centavosADolares(centavos: number): number {
  return centavos / 100
}

// Calcula el porcentaje de variación entre el período actual y el anterior
function calcularVariacion(actual: number, anterior: number): number {
  if (anterior === 0) return 0
  return ((actual - anterior) / Math.abs(anterior)) * 100
}

// Agrega múltiples filas de campañas en una sola estructura de métricas por fecha
function agregarMetricas(filas: FilaMetrica[]): MetricasAgregadas {
  if (filas.length === 0) {
    return { gasto: 0, roas: 0, ctr: 0, cpc: 0, conversiones: 0, cpa: 0 }
  }

  const gastoTotal = centavosADolares(
    filas.reduce((sum, f) => sum + f.gasto_centavos, 0)
  )
  const impresionesTotal = filas.reduce((sum, f) => sum + f.impresiones, 0)
  const clicsTotal = filas.reduce((sum, f) => sum + f.clics, 0)
  const conversionesTotal = filas.reduce((sum, f) => sum + f.conversiones, 0)

  // ROAS = ingresos / gasto (usando promedio ponderado por gasto de campaña)
  const ingresosTotal = centavosADolares(
    filas.reduce((sum, f) => sum + f.ingresos_centavos, 0)
  )
  const roas = gastoTotal > 0 ? ingresosTotal / gastoTotal : 0

  // CTR = clics / impresiones × 100
  const ctr = impresionesTotal > 0 ? (clicsTotal / impresionesTotal) * 100 : 0

  // CPC = gasto / clics
  const cpc = clicsTotal > 0 ? gastoTotal / clicsTotal : 0

  // CPA = gasto / conversiones
  const cpa = conversionesTotal > 0 ? gastoTotal / conversionesTotal : 0

  return { gasto: gastoTotal, roas, ctr, cpc, conversiones: conversionesTotal, cpa }
}

// Obtiene las métricas KPI del Supabase o retorna datos demo si no hay datos
async function obtenerDatosKPI(): Promise<{
  gasto: MetricaKPI
  roas: MetricaKPI
  ctr: MetricaKPI
  cpc: MetricaKPI
  conversiones: MetricaKPI
  cpa: MetricaKPI
}> {
  try {
    const supabase = await crearClienteServidor()

    // Verificar autenticación — si no hay sesión retornamos demo
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return DATOS_DEMO_KPI

    // Obtener las 2 fechas más recientes con métricas del tenant (RLS filtra por tenant)
    const { data: fechasRaw } = await supabase
      .from('daily_metrics')
      .select('fecha')
      .order('fecha', { ascending: false })
      .limit(2)

    // Sin datos en BD → usar demo sin lanzar error
    if (!fechasRaw || fechasRaw.length === 0) return DATOS_DEMO_KPI

    const [fechaActual, fechaAnterior] = fechasRaw.map((f) => f.fecha)

    // Obtener todas las filas del día actual (todas las campañas del tenant)
    const { data: filasActuales } = await supabase
      .from('daily_metrics')
      .select(
        'gasto_centavos, ingresos_centavos, impresiones, clics, conversiones, roas, ctr, cpc, cpa'
      )
      .eq('fecha', fechaActual)

    // Si solo hay una fecha disponible, comparamos contra cero (100% variación)
    const { data: filasAnteriores } = fechaAnterior
      ? await supabase
          .from('daily_metrics')
          .select(
            'gasto_centavos, ingresos_centavos, impresiones, clics, conversiones, roas, ctr, cpc, cpa'
          )
          .eq('fecha', fechaAnterior)
      : { data: [] }

    // Sin filas en el período actual → usar demo
    if (!filasActuales || filasActuales.length === 0) return DATOS_DEMO_KPI

    const actual = agregarMetricas(filasActuales as FilaMetrica[])
    const anterior = agregarMetricas((filasAnteriores ?? []) as FilaMetrica[])

    const PERIODO = 'vs día anterior'

    return {
      gasto: {
        valor: actual.gasto,
        variacion: calcularVariacion(actual.gasto, anterior.gasto),
        periodo: PERIODO,
      },
      roas: {
        valor: actual.roas,
        variacion: calcularVariacion(actual.roas, anterior.roas),
        periodo: PERIODO,
      },
      ctr: {
        valor: actual.ctr,
        variacion: calcularVariacion(actual.ctr, anterior.ctr),
        periodo: PERIODO,
      },
      cpc: {
        valor: actual.cpc,
        variacion: calcularVariacion(actual.cpc, anterior.cpc),
        periodo: PERIODO,
      },
      conversiones: {
        valor: actual.conversiones,
        variacion: calcularVariacion(actual.conversiones, anterior.conversiones),
        periodo: PERIODO,
      },
      cpa: {
        valor: actual.cpa,
        variacion: calcularVariacion(actual.cpa, anterior.cpa),
        periodo: PERIODO,
      },
    }
  } catch {
    // Cualquier error de red o Supabase → caer silenciosamente a demo
    return DATOS_DEMO_KPI
  }
}

// Componente que renderiza el grid de 6 KPI cards — Server Component
export default async function GrupoKPIs() {
  const datos = await obtenerDatosKPI()

  // Definición de cada tarjeta KPI con su configuración visual y datos
  const tarjetas = [
    {
      titulo: 'Gasto',
      valor: formatearMoneda(datos.gasto.valor),
      variacion: datos.gasto.variacion,
      periodo: datos.gasto.periodo,
      icono: (
        <DollarSign
          size={16}
          className="text-primary"
          aria-hidden="true"
        />
      ),
    },
    {
      titulo: 'ROAS',
      valor: `${datos.roas.valor.toFixed(1).replace('.', ',')}x`,
      variacion: datos.roas.variacion,
      periodo: datos.roas.periodo,
      icono: (
        <TrendingUp
          size={16}
          className="text-primary"
          aria-hidden="true"
        />
      ),
    },
    {
      titulo: 'CTR',
      valor: `${datos.ctr.valor.toFixed(1).replace('.', ',')}%`,
      variacion: datos.ctr.variacion,
      periodo: datos.ctr.periodo,
      icono: (
        <MousePointer
          size={16}
          className="text-primary"
          aria-hidden="true"
        />
      ),
    },
    {
      titulo: 'CPC',
      valor: formatearMoneda(datos.cpc.valor),
      variacion: datos.cpc.variacion,
      periodo: datos.cpc.periodo,
      icono: (
        <MousePointerClick
          size={16}
          className="text-primary"
          aria-hidden="true"
        />
      ),
    },
    {
      titulo: 'Conversiones',
      valor: formatearNumero(datos.conversiones.valor),
      variacion: datos.conversiones.variacion,
      periodo: datos.conversiones.periodo,
      icono: (
        <ShoppingCart
          size={16}
          className="text-primary"
          aria-hidden="true"
        />
      ),
    },
    {
      titulo: 'CPA',
      valor: formatearMoneda(datos.cpa.valor),
      variacion: datos.cpa.variacion,
      periodo: datos.cpa.periodo,
      icono: (
        <Target
          size={16}
          className="text-primary"
          aria-hidden="true"
        />
      ),
    },
  ]

  return (
    // Grid responsive: 2 cols en móvil, 3 en tablet, 6 en escritorio
    <section
      className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4"
      aria-label="Métricas principales de campañas"
    >
      {tarjetas.map((tarjeta) => (
        <TarjetaKPI
          key={tarjeta.titulo}
          titulo={tarjeta.titulo}
          valor={tarjeta.valor}
          variacion={tarjeta.variacion}
          periodo={tarjeta.periodo}
          icono={tarjeta.icono}
        />
      ))}
    </section>
  )
}
