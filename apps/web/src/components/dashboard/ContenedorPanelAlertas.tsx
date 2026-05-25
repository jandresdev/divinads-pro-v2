// Server Component — resuelve alertas de anomalías desde Supabase
// y las pasa al componente cliente PanelAlertas.
// Fallback silencioso a datos demo ante cualquier error o tabla vacía.

import { crearClienteServidor } from '@/lib/supabase/servidor'
import PanelAlertas, { type Alerta } from './PanelAlertas'

// ─── Tipo auxiliar de severidad ───────────────────────────────────────────────

type Severidad = 'critica' | 'alta' | 'media' | 'baja'

// ─── Datos demo ───────────────────────────────────────────────────────────────

// Se usan cuando Supabase no está disponible, no hay sesión activa o la tabla
// de anomalías aún no contiene datos reales.
const DEMO_ALERTAS: Alerta[] = [
  {
    id: 'a1',
    tipo: 'roas_bajo',
    severidad: 'critica',
    titulo: 'ROAS cayó −22% en las últimas 24h',
    campaña: 'Prospección - Lookalike 2%',
    descripcion: 'El ROAS bajó de 4,8x a 3,7x. Posible fatiga de audiencia.',
    tiempo: 'hace 2h',
    revisada: false,
  },
  {
    id: 'a2',
    tipo: 'cpc_alto',
    severidad: 'alta',
    titulo: 'CPC aumentó +35% esta semana',
    campaña: 'Remarketing - Visitantes 30d',
    descripcion: 'El CPC subió de $1,20 a $1,62. Competencia alta en subasta.',
    tiempo: 'hace 5h',
    revisada: false,
  },
  {
    id: 'a3',
    tipo: 'frecuencia_alta',
    severidad: 'media',
    titulo: 'Frecuencia alta detectada',
    campaña: 'Retargeting - Carrito Abandonado',
    descripcion: 'Frecuencia promedio: 6,2x. Riesgo de fatiga de audiencia.',
    tiempo: 'hace 1d',
    revisada: false,
  },
  {
    id: 'a4',
    tipo: 'presupuesto_agotado',
    severidad: 'alta',
    titulo: 'Presupuesto diario agotado a las 2PM',
    campaña: 'Conversión - DABA Catálogo',
    descripcion:
      'El presupuesto se consumió antes del fin del día. Considera aumentarlo.',
    tiempo: 'hace 3d',
    revisada: true,
  },
]

// ─── Tipos internos de Supabase ───────────────────────────────────────────────

// Forma esperada de cada fila de la tabla anomalies con el join a campaigns
interface FilaAnomalia {
  id: string
  tipo: string | null
  severidad_score: number | null
  titulo: string | null
  descripcion: string | null
  // El join a campaigns retorna un objeto o null
  campaña: { nombre: string } | null
  created_at: string | null
  revisada: boolean | null
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
 * Retorna DEMO_ALERTAS ante cualquier error, sesión inexistente o tabla vacía.
 */
async function obtenerAlertas(): Promise<Alerta[]> {
  try {
    const supabase = await crearClienteServidor()

    // Sin sesión activa → datos demo (evita consultas sin contexto de tenant)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return DEMO_ALERTAS

    const { data: filas, error } = await supabase
      .from('anomalies')
      .select(
        'id, tipo, severidad_score, titulo, descripcion, campaña:campaign_id(nombre), created_at, revisada'
      )
      .eq('activa', true)
      .order('severidad_score', { ascending: false })
      .limit(10)

    // Error de Supabase o respuesta vacía → datos demo
    if (error || !filas || filas.length === 0) return DEMO_ALERTAS

    // Transformar filas al formato que espera PanelAlertas
    const alertas: Alerta[] = (filas as unknown as FilaAnomalia[])
      .map((fila): Alerta | null => {
        // Omitir filas sin score de severidad (campo obligatorio para el orden)
        if (fila.severidad_score == null) return null

        return {
          id: fila.id,
          tipo: fila.tipo ?? 'desconocido',
          severidad: mapearSeveridad(fila.severidad_score),
          titulo: fila.titulo ?? 'Anomalía detectada',
          campaña: fila.campaña?.nombre ?? 'Campaña desconocida',
          descripcion: fila.descripcion ?? '',
          tiempo: fila.created_at ? tiempoRelativo(fila.created_at) : 'sin fecha',
          revisada: fila.revisada ?? false,
        }
      })
      .filter((a): a is Alerta => a !== null)

    // Si el mapeo no produjo ninguna alerta válida → datos demo
    return alertas.length > 0 ? alertas : DEMO_ALERTAS
  } catch {
    // Cualquier excepción no esperada → datos demo, sin romper la UI
    return DEMO_ALERTAS
  }
}

// ─── Componente servidor ──────────────────────────────────────────────────────

/**
 * Resuelve las alertas de anomalías y renderiza el panel cliente.
 */
export default async function ContenedorPanelAlertas() {
  const alertas = await obtenerAlertas()

  return <PanelAlertas alertas={alertas} />
}
