// Server Component — resuelve insights del agente IA desde Supabase
// y los pasa al componente cliente SidebarInsightsIA.
// Sin datos demo para usuarios autenticados — muestra estado vacío real.

import { obtenerContextoAdmin } from '@/lib/supabase/servidor'
import SidebarInsightsIA, { type Insight } from './SidebarInsightsIA'

// ─── Tipos internos de Supabase ───────────────────────────────────────────────

// Forma esperada de cada fila de la tabla agent_actions
interface FilaAccionAgente {
  id: string
  tipo_accion: string | null
  descripcion: string | null
  confianza: number | null
  created_at: string | null
}

// Mapeo de tipo_accion de agent_actions → tipo de insight visual
const MAPA_TIPO_ACCION: Record<string, Insight['tipo']> = {
  pausar_campaña:      'advertencia',
  reducir_presupuesto: 'advertencia',
  aumentar_presupuesto: 'oportunidad',
  solo_monitorear:     'prediccion',
  // tipos directos (por si el agente ya los guarda así)
  oportunidad:  'oportunidad',
  advertencia:  'advertencia',
  logro:        'logro',
  prediccion:   'prediccion',
}

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
 * Para usuarios autenticados retorna lista vacía si no hay acciones (no datos demo).
 */
async function obtenerInsights(): Promise<Insight[]> {
  try {
    // Usar admin client para bypasear RLS — filtro explícito por tenant_id
    const ctx = await obtenerContextoAdmin()
    if (!ctx) return []

    const { data: filas, error } = await ctx.admin
      .from('agent_actions')
      .select('id, tipo_accion, descripcion, confianza, created_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('estado', 'completado')
      .order('created_at', { ascending: false })
      .limit(5)

    // Error de Supabase o sin acciones → lista vacía real
    if (error || !filas || filas.length === 0) return []

    // Transformar filas al formato que espera SidebarInsightsIA
    const insights: Insight[] = (filas as FilaAccionAgente[])
      .map((fila): Insight | null => {
        if (!fila.tipo_accion) return null
        const tipoInsight = MAPA_TIPO_ACCION[fila.tipo_accion]
        if (!tipoInsight) return null

        return {
          id: fila.id,
          tipo: tipoInsight,
          titulo: fila.descripcion?.split('.')[0] ?? 'Acción del agente',
          descripcion: fila.descripcion ?? '',
          confianza: fila.confianza ?? 80,
          accion: null,
          timestamp: fila.created_at ? tiempoRelativo(fila.created_at) : 'sin fecha',
        }
      })
      .filter((i): i is Insight => i !== null)

    return insights
  } catch {
    // Cualquier excepción → lista vacía, sin romper la UI
    return []
  }
}

// ─── Componente servidor ──────────────────────────────────────────────────────

/**
 * Resuelve los insights del agente IA y renderiza el sidebar flotante cliente.
 * Si no hay insights, el componente muestra el estado vacío apropiado.
 */
export default async function ContenedorInsightsIA() {
  const insights = await obtenerInsights()

  return <SidebarInsightsIA insights={insights} />
}
