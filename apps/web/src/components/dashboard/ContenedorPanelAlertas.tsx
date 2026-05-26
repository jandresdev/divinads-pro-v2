// Server Component — resuelve alertas de anomalías desde Supabase
// y las pasa al componente cliente PanelAlertas.
// Sin datos demo para usuarios autenticados — muestra estado vacío real.

import { obtenerContextoAdmin } from '@/lib/supabase/servidor'
import PanelAlertas, { type Alerta } from './PanelAlertas'

// ─── Tipo auxiliar de severidad ───────────────────────────────────────────────

type Severidad = 'critica' | 'alta' | 'media' | 'baja'

// ─── Tipos internos de Supabase ───────────────────────────────────────────────

// Forma esperada de cada fila de la tabla anomalies con el join a campaigns
// Columnas reales del schema: severidad (0-100), tipo, nombre_metrica, causa_detectada, estado
interface FilaAnomalia {
  id: string
  tipo: string | null
  severidad: number | null
  nombre_metrica: string | null
  causa_detectada: string | null
  estado: string | null
  // El join a campaigns retorna un objeto o null
  campaña: { nombre: string } | null
  created_at: string | null
}

// ─── Utilidad: mapear severidad_score numérico al enum de Severidad ───────────

/**
 * Convierte la puntuación numérica de una anomalía a la etiqueta de severidad
 * que espera PanelAlertas.
 */
function mapearSeveridad(score: number): Severidad {
  if (score >= 90) return 'critica'
  if (score >= 70) return 'alta'
  if (score >= 40) return 'media'
  return 'baja'
}

// ─── Utilidad: convertir fecha ISO a tiempo relativo legible ─────────────────

/**
 * Transforma una fecha ISO en una cadena relativa en español:
 * "hace X minutos", "hace Xh", "hace Xd", etc.
 */
function tiempoRelativo(fechaISO: string): string {
  try {
    const diff = Date.now() - new Date(fechaISO).getTime()
    const minutos = Math.floor(diff / 60_000)
    if (minutos < 60) return `hace ${minutos}m`
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
 * Consulta la tabla `anomalies` en Supabase y devuelve las alertas activas
 * ordenadas por puntuación de severidad descendente.
 * Para usuarios autenticados retorna lista vacía si no hay anomalías (no datos demo).
 */
async function obtenerAlertas(): Promise<Alerta[]> {
  try {
    // Usar admin client para bypasear RLS — filtro explícito por tenant_id
    const ctx = await obtenerContextoAdmin()
    if (!ctx) return []

    const { data: filas, error } = await ctx.admin
      .from('anomalies')
      .select(
        'id, tipo, severidad, nombre_metrica, causa_detectada, estado, campaña:campaign_id(nombre), created_at'
      )
      .eq('tenant_id', ctx.tenantId)
      .in('estado', ['abierta', 'investigando'])
      .order('severidad', { ascending: false })
      .limit(10)

    // Error de Supabase o sin anomalías → lista vacía real
    if (error || !filas || filas.length === 0) return []

    // Transformar filas al formato que espera PanelAlertas
    const alertas: Alerta[] = (filas as unknown as FilaAnomalia[])
      .map((fila): Alerta | null => {
        // Omitir filas sin score de severidad (campo obligatorio para el orden)
        if (fila.severidad == null) return null

        return {
          id: fila.id,
          tipo: fila.tipo ?? 'desconocido',
          severidad: mapearSeveridad(fila.severidad),
          titulo: fila.nombre_metrica ?? 'Anomalía detectada',
          campaña: fila.campaña?.nombre ?? 'Campaña desconocida',
          descripcion: fila.causa_detectada ?? '',
          tiempo: fila.created_at ? tiempoRelativo(fila.created_at) : 'sin fecha',
          revisada: fila.estado === 'resuelta' || fila.estado === 'ignorada',
        }
      })
      .filter((a): a is Alerta => a !== null)

    return alertas
  } catch {
    // Cualquier excepción → lista vacía, sin romper la UI
    return []
  }
}

// ─── Componente servidor ──────────────────────────────────────────────────────

/**
 * Resuelve las alertas de anomalías y renderiza el panel cliente.
 * Si no hay alertas, el componente muestra el estado vacío "Sin alertas activas".
 */
export default async function ContenedorPanelAlertas() {
  const alertas = await obtenerAlertas()

  return <PanelAlertas alertas={alertas} />
}
