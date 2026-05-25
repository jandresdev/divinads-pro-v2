// Server Component — resuelve insights del agente IA desde Supabase
// y los pasa al componente cliente SidebarInsightsIA.
// Fallback silencioso a datos demo ante cualquier error o tabla vacía.

import { crearClienteServidor } from '@/lib/supabase/servidor'
import SidebarInsightsIA, { type Insight } from './SidebarInsightsIA'

// ─── Datos demo ───────────────────────────────────────────────────────────────

// Se usan cuando Supabase no está disponible, no hay sesión activa o la tabla
// agent_actions aún no contiene insights completados.
const DEMO_INSIGHTS: Insight[] = [
  {
    id: 'i1',
    tipo: 'oportunidad',
    titulo: 'Oportunidad de escalado',
    descripcion:
      'La campaña "Retargeting - Carrito" tiene ROAS de 8,4x con presupuesto diario de solo $200. Aumentar 2x podría generar $3.200 adicionales esta semana.',
    confianza: 87,
    accion: 'Escalar presupuesto',
    timestamp: 'hace 15 min',
  },
  {
    id: 'i2',
    tipo: 'advertencia',
    titulo: 'Fatiga de audiencia detectada',
    descripcion:
      'Prospección Lookalike 2% muestra frecuencia de 6,8x en los últimos 7 días. Se recomienda refrescar creatividades o expandir audiencia.',
    confianza: 92,
    accion: 'Ver campaña',
    timestamp: 'hace 1h',
  },
  {
    id: 'i3',
    tipo: 'logro',
    titulo: 'Mejor semana del mes',
    descripcion:
      'El gasto total de esta semana superó $38.000 con ROAS promedio de 4,2x, un 18% mejor que la semana anterior.',
    confianza: 99,
    accion: null,
    timestamp: 'hace 3h',
  },
  {
    id: 'i4',
    tipo: 'prediccion',
    titulo: 'Proyección del mes',
    descripcion:
      'Con el ritmo actual, cerrarás el mes con $145.000 en gasto y 4.680 conversiones. ROAS estimado: 4,4x.',
    confianza: 78,
    accion: 'Ver proyección',
    timestamp: 'hace 6h',
  },
]

// ─── Tipos internos de Supabase ───────────────────────────────────────────────

// Forma esperada de cada fila de la tabla agent_actions
interface FilaAccionAgente {
  id: string
  tipo_accion: string | null
  descripcion: string | null
  confianza: number | null
  created_at: string | null
}

// Subconjunto válido de tipos de insight que reconocemos
const TIPOS_VALIDOS = new Set(['oportunidad', 'advertencia', 'logro', 'prediccion'])

// ─── Utilidad: tiempo relativo ────────────────────────────────────────────────

/**
 * Transforma una fecha ISO en una cadena relativa legible en español:
 * "hace X min", "hace Xh", "hace Xd".
 */
function tiempoRelativo(fechaISO: string): string {
  try {
    const diff = Date.now() - new Date(fechaISO).getTime()
    const minutos = Math.floor(diff / 60_000)
    if (minutos < 60) return `hace ${minutos} min`
    const horas = Math.floor(minutos / 60)
    if (horas < 24) return `hace ${horas}h`
    const dias = Math.floor(horas / 24)
    return `hace ${dias}d`
  } catch {
    return 'fecha desconocida'
  }
}

// ─── Función de obtención de datos ───────────────────────────────────────────

/**
 * Consulta la tabla `agent_actions` en Supabase filtrando por estado='completado'
 * y devuelve los insights más recientes.
 * Retorna DEMO_INSIGHTS ante cualquier error, sesión inexistente o tabla vacía.
 */
async function obtenerInsights(): Promise<Insight[]> {
  try {
    const supabase = await crearClienteServidor()

    // Sin sesión activa → datos demo (evita consultas sin contexto de tenant)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return DEMO_INSIGHTS

    const { data: filas, error } = await supabase
      .from('agent_actions')
      .select('id, tipo_accion, descripcion, confianza, created_at')
      .eq('estado', 'completado')
      .order('created_at', { ascending: false })
      .limit(5)

    // Error de Supabase o respuesta vacía → datos demo
    if (error || !filas || filas.length === 0) return DEMO_INSIGHTS

    // Transformar filas al formato que espera SidebarInsightsIA
    const insights: Insight[] = (filas as FilaAccionAgente[])
      .map((fila): Insight | null => {
        // Omitir filas sin tipo o con tipo desconocido
        if (!fila.tipo_accion || !TIPOS_VALIDOS.has(fila.tipo_accion)) return null

        return {
          id: fila.id,
          tipo: fila.tipo_accion as Insight['tipo'],
          titulo: fila.descripcion?.split('.')[0] ?? 'Insight del agente',
          descripcion: fila.descripcion ?? '',
          confianza: fila.confianza ?? 80,
          accion: null, // Las acciones específicas se resolverán en fases posteriores
          timestamp: fila.created_at ? tiempoRelativo(fila.created_at) : 'sin fecha',
        }
      })
      .filter((i): i is Insight => i !== null)

    // Si el mapeo no produjo ningún insight válido → datos demo
    return insights.length > 0 ? insights : DEMO_INSIGHTS
  } catch {
    // Cualquier excepción no esperada → datos demo, sin romper la UI
    return DEMO_INSIGHTS
  }
}

// ─── Componente servidor ──────────────────────────────────────────────────────

/**
 * Resuelve los insights del agente IA y renderiza el sidebar flotante cliente.
 */
export default async function ContenedorInsightsIA() {
  const insights = await obtenerInsights()

  return <SidebarInsightsIA insights={insights} />
}
