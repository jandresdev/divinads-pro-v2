// Server Component — resuelve datos de campañas desde Supabase
// y los pasa al componente cliente TablaCampañas.
// Si el usuario está autenticado pero no tiene datos, muestra estado vacío (no datos demo).

import { crearClienteServidor } from '@/lib/supabase/servidor'
import TablaCampañas, { type DatoCampaña } from './TablaCampañas'
import SinConexionMeta from '@/components/SinConexionMeta'

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
  tipo: string | null
  estado: string | null
  daily_metrics: FilaMetrica[] | FilaMetrica | null
}

// ─── Función de obtención de datos ───────────────────────────────────────────

/**
 * Consulta Supabase para obtener las campañas y su métrica más reciente.
 * Para cada campaña se toma el registro de daily_metrics con la fecha más alta.
 * Retorna null cuando hay sesión activa pero no hay datos reales disponibles.
 * Solo retorna datos demo cuando NO hay sesión (usuario no autenticado).
 */
async function obtenerCampañas(): Promise<{ campañas: DatoCampaña[]; autenticado: boolean }> {
  try {
    const supabase = await crearClienteServidor()

    // Sin sesión activa → sin datos (la UI mostrará estado vacío apropiado)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { campañas: [], autenticado: false }

    // Consulta con join a daily_metrics — se toman todas las métricas y luego
    // se filtra la más reciente en memoria para máxima compatibilidad
    const { data: filas, error } = await supabase
      .from('campaigns')
      .select(`
        id,
        nombre,
        tipo,
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

    // Error de Supabase o sin campañas registradas → autenticado pero sin datos
    if (error || !filas || filas.length === 0) {
      return { campañas: [], autenticado: true }
    }

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
          tipo: fila.tipo ?? 'OTRO',
          estado: fila.estado === 'PAUSED' ? 'pausada' : 'activa',
          gasto: (metricaReciente.gasto_centavos ?? 0) / 100,
          roas: metricaReciente.roas ?? 0,
          ctr: metricaReciente.ctr ?? 0,
          conversiones: metricaReciente.conversiones ?? 0,
          cpa: metricaReciente.cpa ?? 0,
        } satisfies DatoCampaña
      })
      .filter((c): c is DatoCampaña => c !== null)

    return { campañas, autenticado: true }
  } catch {
    // Cualquier excepción no esperada → autenticado pero sin datos
    return { campañas: [], autenticado: true }
  }
}

// ─── Componente servidor ──────────────────────────────────────────────────────

/**
 * Resuelve los datos de campañas y renderiza la tabla cliente.
 * Si el usuario está autenticado pero no hay datos, muestra el estado de conexión.
 */
export default async function ContenedorTablaCampañas() {
  const { campañas, autenticado } = await obtenerCampañas()

  // Sin autenticación → mostrar estado de conexión
  if (!autenticado) {
    return (
      <SinConexionMeta mensaje="Conecta tu cuenta de Meta Ads para ver el rendimiento de tus campañas en tiempo real." />
    )
  }

  // Autenticado pero sin campañas con datos → invitar a conectar o esperar sync
  if (campañas.length === 0) {
    return (
      <SinConexionMeta mensaje="No hay datos de campañas disponibles aún. Conecta tu cuenta de Meta Ads o espera que se completen los primeros 15 minutos de sincronización." />
    )
  }

  return <TablaCampañas campañas={campañas} />
}
