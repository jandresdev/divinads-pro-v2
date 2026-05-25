import Anthropic from '@anthropic-ai/sdk'
import logger from '../utils/logger'

// ---------------------------------------------------------------------------
// Inicialización del cliente de Anthropic
// ---------------------------------------------------------------------------

// Cliente Anthropic — la API key se carga desde variables de entorno
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Modelo a usar — claude-3-5-haiku para velocidad, claude-3-5-sonnet para calidad
const MODELO_AGENTE = 'claude-3-5-haiku-20241022'

// Límite de tokens en la respuesta del agente
const TOKENS_MAXIMOS = 4096

// ---------------------------------------------------------------------------
// Definición de herramientas disponibles para el agente
// ---------------------------------------------------------------------------

// Herramientas que el agente puede invocar durante su razonamiento
export const HERRAMIENTAS_AGENTE: Anthropic.Tool[] = [
  {
    name: 'obtener_metricas_campaña',
    description:
      'Obtiene las métricas diarias de una campaña (ROAS, gasto, CTR, CPC, conversiones, CPA) para un período específico',
    input_schema: {
      type: 'object',
      properties: {
        campaign_id: {
          type: 'string',
          description: 'UUID de la campaña en la base de datos',
        },
        dias: {
          type: 'number',
          description: 'Número de días hacia atrás a consultar (máximo 30)',
          default: 7,
        },
      },
      required: ['campaign_id'],
    },
  },
  {
    name: 'obtener_historial_anomalias',
    description:
      'Obtiene el historial de anomalías anteriores de una campaña para detectar patrones recurrentes',
    input_schema: {
      type: 'object',
      properties: {
        campaign_id: {
          type: 'string',
          description: 'UUID de la campaña',
        },
        limit: {
          type: 'number',
          description: 'Máximo de anomalías a traer',
          default: 10,
        },
      },
      required: ['campaign_id'],
    },
  },
  {
    name: 'obtener_prediccion_roas',
    description:
      'Obtiene la predicción de ROAS a 7 días generada por el modelo ML',
    input_schema: {
      type: 'object',
      properties: {
        campaign_id: {
          type: 'string',
          description: 'UUID de la campaña',
        },
      },
      required: ['campaign_id'],
    },
  },
  {
    name: 'obtener_contexto_tenant',
    description:
      'Obtiene la configuración del tenant: tolerancia al riesgo, límite de auto-ejecución, objetivos de ROAS',
    input_schema: {
      type: 'object',
      properties: {
        tenant_id: {
          type: 'string',
          description: 'UUID del tenant',
        },
      },
      required: ['tenant_id'],
    },
  },
]

// ---------------------------------------------------------------------------
// Tipos de respuesta del agente
// ---------------------------------------------------------------------------

// Tipos de acción que el agente puede recomendar
type TipoAccion =
  | 'pausar_campaña'
  | 'reducir_presupuesto'
  | 'aumentar_presupuesto'
  | 'cambiar_audiencia'
  | 'solo_monitorear'

// Representa una opción de acción concreta que el agente puede recomendar
export interface OpcionAccion {
  // Descripción corta de la acción: "Pausar campaña"
  accion: string
  // Explicación detallada de por qué se recomienda esta acción
  descripcion: string
  // Impacto estimado en formato legible: "−$245 en gasto, +0,8x en ROAS"
  impactoEstimado: string
  // Tipo de acción para que el ejecutor sepa qué hacer
  tipoAccion: TipoAccion
  // Parámetros adicionales para ejecutar la acción (opcional)
  parametros?: Record<string, unknown>
  // true si el impacto esperado supera $100 USD
  requiereAprobacion: boolean
}

// Respuesta estructurada completa del agente
export interface RespuestaAgente {
  // Análisis de la causa raíz en español
  analisis: string
  // 2-3 opciones de acción ordenadas de más a menos agresiva
  opciones: OpcionAccion[]
  // Índice de la opción recomendada (0-based)
  recomendacion: number
  // Nivel de confianza del agente: 0-100
  confianza: number
  // Chain of thought del agente en español
  razonamiento: string
}

// ---------------------------------------------------------------------------
// Prompt del sistema para el agente
// ---------------------------------------------------------------------------

// Instrucciones base que definen el comportamiento del agente DivinADS
const PROMPT_SISTEMA = `Eres DivinADS Agent, un experto en optimización de campañas de Meta Ads especializado en mercados LATAM.

Tu objetivo es analizar anomalías en campañas publicitarias, identificar causas raíces y recomendar acciones específicas y ejecutables.

INSTRUCCIONES:
1. Usa las herramientas disponibles para recopilar contexto completo antes de hacer recomendaciones
2. Siempre analiza al menos: métricas actuales, historial de anomalías y predicción de ROAS
3. Genera exactamente 2-3 opciones de acción ordenadas de más a menos agresiva
4. La primera opción debe ser la más agresiva (ej: pausar), la última debe ser siempre "monitorear sin acción"
5. Para cada opción, explica el impacto estimado en USD y en ROAS
6. Si el impacto esperado de una acción supera $100 USD, marca requiereAprobacion como true
7. Tu respuesta final debe ser JSON válido con la estructura RespuestaAgente

FORMATO DE RESPUESTA FINAL:
Después de usar las herramientas, responde con un JSON así:
{
  "analisis": "...",
  "opciones": [
    {
      "accion": "...",
      "descripcion": "...",
      "impactoEstimado": "...",
      "tipoAccion": "...",
      "parametros": {},
      "requiereAprobacion": true
    }
  ],
  "recomendacion": 0,
  "confianza": 85,
  "razonamiento": "..."
}

Responde siempre en español. Usa formato numérico español: coma decimal, punto miles.`

// ---------------------------------------------------------------------------
// Función principal: ejecutar el agente con tool_use
// ---------------------------------------------------------------------------

/**
 * Ejecuta el agente de Claude con capacidad de llamar herramientas.
 * Implementa el loop de tool_use con un máximo de 5 iteraciones para
 * evitar bucles infinitos en caso de comportamiento inesperado del modelo.
 *
 * @param mensajeUsuario - Descripción de la anomalía detectada
 * @param ejecutarHerramienta - Función despachadora que ejecuta las herramientas
 * @returns Respuesta estructurada con análisis, opciones y recomendación
 */
export async function ejecutarAgente(
  mensajeUsuario: string,
  ejecutarHerramienta: (nombre: string, input: Record<string, unknown>) => Promise<string>
): Promise<RespuestaAgente> {
  // Historial de mensajes para el contexto del agente
  const mensajes: Anthropic.MessageParam[] = [
    { role: 'user', content: mensajeUsuario },
  ]

  // Loop de tool_use — máximo 5 iteraciones para evitar bucles infinitos
  for (let iteracion = 0; iteracion < 5; iteracion++) {
    logger.debug({ iteracion }, 'Iniciando iteración del agente Claude')

    // Llamada al modelo con las herramientas disponibles
    const respuesta = await anthropic.messages.create({
      model: MODELO_AGENTE,
      max_tokens: TOKENS_MAXIMOS,
      system: PROMPT_SISTEMA,
      tools: HERRAMIENTAS_AGENTE,
      messages: mensajes,
    })

    logger.debug(
      { iteracion, stopReason: respuesta.stop_reason, bloques: respuesta.content.length },
      'Respuesta recibida del agente Claude'
    )

    // -----------------------------------------------------------------------
    // Caso 1: El agente terminó su razonamiento → extraer respuesta final
    // -----------------------------------------------------------------------
    if (respuesta.stop_reason === 'end_turn') {
      // Buscar el bloque de texto con la respuesta JSON
      const textContent = respuesta.content.find((c) => c.type === 'text')

      if (!textContent || textContent.type !== 'text') {
        throw new Error('El agente no retornó contenido de texto en su respuesta final')
      }

      const textoRespuesta = textContent.text

      // Extraer el bloque JSON de la respuesta (puede tener texto antes o después)
      const jsonMatch = textoRespuesta.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        logger.error({ textoRespuesta }, 'El agente no retornó JSON válido')
        throw new Error('El agente no retornó JSON válido en su respuesta final')
      }

      logger.info({ iteracion }, 'Agente Claude completó el análisis exitosamente')
      return JSON.parse(jsonMatch[0]) as RespuestaAgente
    }

    // -----------------------------------------------------------------------
    // Caso 2: El agente quiere usar herramientas → ejecutar y continuar
    // -----------------------------------------------------------------------
    if (respuesta.stop_reason === 'tool_use') {
      // Agregar la respuesta del asistente al historial de mensajes
      mensajes.push({ role: 'assistant', content: respuesta.content })

      // Recopilar resultados de todas las herramientas solicitadas en esta iteración
      const resultadosHerramientas: Anthropic.ToolResultBlockParam[] = []

      for (const bloque of respuesta.content) {
        // Solo procesar bloques de tipo tool_use
        if (bloque.type !== 'tool_use') continue

        logger.info(
          { herramienta: bloque.name, input: bloque.input },
          'Agente ejecutando herramienta'
        )

        try {
          // Ejecutar la herramienta y obtener resultado como string JSON
          const resultado = await ejecutarHerramienta(
            bloque.name,
            bloque.input as Record<string, unknown>
          )

          resultadosHerramientas.push({
            type: 'tool_result',
            tool_use_id: bloque.id,
            content: resultado,
          })
        } catch (error) {
          // Si la herramienta falla, informar al agente para que pueda adaptarse
          const mensajeError =
            error instanceof Error ? error.message : 'Error desconocido'

          logger.warn(
            { herramienta: bloque.name, error: mensajeError },
            'Error al ejecutar herramienta del agente'
          )

          resultadosHerramientas.push({
            type: 'tool_result',
            tool_use_id: bloque.id,
            content: `Error al ejecutar la herramienta: ${mensajeError}`,
            is_error: true,
          })
        }
      }

      // Agregar todos los resultados de herramientas al historial
      mensajes.push({ role: 'user', content: resultadosHerramientas })
    }
  }

  // Si llegamos aquí, el agente no terminó en el máximo de iteraciones
  logger.error({ maxIteraciones: 5 }, 'El agente excedió el máximo de iteraciones sin terminar')
  throw new Error('El agente excedió el máximo de iteraciones (5) sin retornar una respuesta final')
}
