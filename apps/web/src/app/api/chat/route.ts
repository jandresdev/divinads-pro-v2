import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { crearClienteServidor } from '@/lib/supabase/servidor'

let _anthropic: Anthropic | null = null
function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  }
  return _anthropic
}

/**
 * POST /api/chat
 * Recibe el mensaje del usuario, consulta el historial de la BD,
 * llama a Claude con streaming y emite la respuesta como SSE.
 */
export async function POST(req: NextRequest) {
  // Verificar que el usuario esté autenticado antes de procesar
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Validar que el cuerpo contenga un mensaje de texto
  const { mensaje } = await req.json()

  if (!mensaje || typeof mensaje !== 'string') {
    return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
  }

  // Persistir el mensaje del usuario en la tabla de historial
  await supabase
    .from('conversation_messages')
    .insert({
      tenant_id: user.id,  // Simplificado: en producción usar el tenant_id real del workspace
      rol: 'usuario',
      contenido: mensaje,
    })

  // Recuperar los últimos 10 mensajes para dar contexto a Claude
  const { data: historial } = await supabase
    .from('conversation_messages')
    .select('rol, contenido')
    .eq('tenant_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Convertir historial al formato que espera la API de Anthropic
  const mensajesHistorial: Anthropic.MessageParam[] = (historial ?? [])
    .reverse()
    .map(m => ({
      role: m.rol === 'usuario' ? 'user' : 'assistant',
      content: m.contenido,
    }))

  // Codificador para convertir texto a bytes en el stream
  const encoder = new TextEncoder()

  // Crear un ReadableStream que emitirá los chunks SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let respuestaCompleta = ''

        // Iniciar el stream de mensajes con Claude Haiku (rápido y eficiente)
        const messageStream = await getAnthropicClient().messages.stream({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1024,
          system: `Eres DivinADS Agent, asistente experto en Meta Ads y marketing digital especializado en LATAM.

Responde en español, de forma concisa y útil. Cuando el usuario pregunte sobre campañas específicas o métricas,
indica que puedes ver sus datos y proporciona análisis útiles.

Usa un tono profesional pero amigable. Formatea números en español (coma decimal, punto miles).`,
          messages: mensajesHistorial.length > 0
            ? [...mensajesHistorial, { role: 'user', content: mensaje }]
            : [{ role: 'user', content: mensaje }],
        })

        // Emitir cada delta de texto como un evento SSE individual
        for await (const event of messageStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const texto = event.delta.text
            respuestaCompleta += texto
            // Formato SSE: "data: <json>\n\n"
            const dato = JSON.stringify({ texto })
            controller.enqueue(encoder.encode(`data: ${dato}\n\n`))
          }
        }

        // Señal estándar de fin de stream SSE
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))

        // Guardar la respuesta completa del asistente en el historial
        await supabase
          .from('conversation_messages')
          .insert({
            tenant_id: user.id,
            rol: 'asistente',
            contenido: respuestaCompleta,
          })

      } catch {
        // Notificar el error al cliente via SSE antes de cerrar el stream
        const errorMsg = JSON.stringify({ error: 'Error al procesar mensaje' })
        controller.enqueue(encoder.encode(`data: ${errorMsg}\n\n`))
      } finally {
        // Siempre cerrar el stream al terminar
        controller.close()
      }
    },
  })

  // Devolver la respuesta con headers apropiados para SSE
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
