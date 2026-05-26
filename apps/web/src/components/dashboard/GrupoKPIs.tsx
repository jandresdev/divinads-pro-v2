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
import { formatearMoneda, formatearNumero } from '@/lib/utils'
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

async function obtenerDatosKPI(diasPeriodo: number): Promise<{
  gasto: MetricaKPI
  roas: MetricaKPI
  ctr: MetricaKPI
  cpc: MetricaKPI
  conversiones: MetricaKPI
  cpa: MetricaKPI
} | null> {
  try {
    const supabase = await crearClienteServidor()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const hoy = new Date()
    const fechaFinActual   = hoy.toISOString().split('T')[0]
    const fechaInicioActual = new Date(hoy.getTime() - diasPeriodo * 86_400_000).toISOString().split('T')[0]
    const fechaInicioAnterior = new Date(hoy.getTime() - diasPeriodo * 2 * 86_400_000).toISOString().split('T')[0]

    const campos = 'gasto_centavos, ingresos_centavos, impresiones, clics, conversiones, roas, ctr, cpc, cpa'

    const [{ data: filasActuales }, { data: filasAnteriores }] = await Promise.all([
      supabase
        .from('daily_metrics')
        .select(campos)
        .gte('fecha', fechaInicioActual)
        .lte('fecha', fechaFinActual),
      supabase
        .from('daily_metrics')
        .select(campos)
        .gte('fecha', fechaInicioAnterior)
        .lt('fecha', fechaInicioActual),
    ])

    if (!filasActuales || filasActuales.length === 0) return null

    const actual = agregarMetricas(filasActuales as FilaMetrica[])
    const anterior = agregarMetricas((filasAnteriores ?? []) as FilaMetrica[])

    const PERIODO = diasPeriodo === 1
      ? 'vs día anterior'
      : `vs ${diasPeriodo}d anteriores`

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
    return null
  }
}

const KPI_VACIO: MetricaKPI = { valor: 0, variacion: 0, periodo: 'Sin datos aún' }

// Componente que renderiza el grid de 6 KPI cards — Server Component
export default async function GrupoKPIs({ diasPeriodo = 1 }: { diasPeriodo?: number }) {
  const datos = await obtenerDatosKPI(diasPeriodo)

  const d = datos ?? {
    gasto: KPI_VACIO, roas: KPI_VACIO, ctr: KPI_VACIO,
    cpc: KPI_VACIO, conversiones: KPI_VACIO, cpa: KPI_VACIO,
  }

  // Definición de cada tarjeta KPI con su configuración visual y datos
  const tarjetas = [
    {
      titulo: 'Gasto',
      valor: formatearMoneda(d.gasto.valor),
      variacion: d.gasto.variacion,
      periodo: d.gasto.periodo,
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
      valor: `${d.roas.valor.toFixed(1).replace('.', ',')}x`,
      variacion: d.roas.variacion,
      periodo: d.roas.periodo,
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
      valor: `${d.ctr.valor.toFixed(1).replace('.', ',')}%`,
      variacion: d.ctr.variacion,
      periodo: d.ctr.periodo,
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
      valor: formatearMoneda(d.cpc.valor),
      variacion: d.cpc.variacion,
      periodo: d.cpc.periodo,
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
      valor: formatearNumero(d.conversiones.valor),
      variacion: d.conversiones.variacion,
      periodo: d.conversiones.periodo,
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
      valor: formatearMoneda(d.cpa.valor),
      variacion: d.cpa.variacion,
      periodo: d.cpa.periodo,
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
