'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Tipo que representa un mensaje en la conversación
interface Mensaje {
  id: string
  rol: 'usuario' | 'asistente'
  contenido: string
  timestamp: Date
  cargando?: boolean
}

interface PropsInterfazChat {
  historialInicial?: Mensaje[]
}

export default function InterfazChat({ historialInicial = [] }: PropsInterfazChat) {
  const [mensajes, setMensajes] = useState<Mensaje[]>(historialInicial)
  const [inputTexto, setInputTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const refFinalMensajes = useRef<HTMLDivElement>(null)
  const refInput = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll al último mensaje cuando cambia la lista
  useEffect(() => {
    refFinalMensajes.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  // Ajustar altura del textarea automáticamente según el contenido
  function ajustarAlturaTextarea() {
    const el = refInput.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  async function enviarMensaje() {
    const texto = inputTexto.trim()
    if (!texto || enviando) return

    // Agregar mensaje del usuario a la lista
    const mensajeUsuario: Mensaje = {
      id: `u-${Date.now()}`,
      rol: 'usuario',
      contenido: texto,
      timestamp: new Date(),
    }

    // Agregar placeholder de carga mientras el asistente responde
    const mensajeCargando: Mensaje = {
      id: `a-${Date.now()}`,
      rol: 'asistente',
      contenido: '',
      timestamp: new Date(),
      cargando: true,
    }

    setMensajes(prev => [...prev, mensajeUsuario, mensajeCargando])
    setInputTexto('')
    setEnviando(true)

    // Resetear altura del textarea
    if (refInput.current) refInput.current.style.height = 'auto'

    try {
      // Llamar al endpoint de chat con streaming SSE
      const respuesta = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: texto }),
      })

      if (!respuesta.ok) throw new Error('Error en la respuesta del servidor')

      // Leer el stream de Server-Sent Events
      const reader = respuesta.body?.getReader()
      const decoder = new TextDecoder()
      let contenidoAcumulado = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          // Procesar cada línea SSE del chunk recibido
          const lineas = chunk.split('\n').filter(l => l.startsWith('data: '))

          for (const linea of lineas) {
            const datos = linea.replace('data: ', '').trim()
            if (datos === '[DONE]') break
            try {
              const json = JSON.parse(datos)
              if (json.texto) {
                contenidoAcumulado += json.texto
                // Actualizar el mensaje del asistente en tiempo real con el texto acumulado
                setMensajes(prev => prev.map(m =>
                  m.id === mensajeCargando.id
                    ? { ...m, contenido: contenidoAcumulado, cargando: false }
                    : m
                ))
              }
            } catch {
              // Ignorar chunks mal formados
            }
          }
        }
      }

      // Asegurar que el estado de carga se elimine aunque no haya habido contenido
      setMensajes(prev => prev.map(m =>
        m.id === mensajeCargando.id && m.cargando
          ? { ...m, contenido: contenidoAcumulado || 'No se recibió respuesta', cargando: false }
          : m
      ))
    } catch {
      // Mostrar mensaje de error en la burbuja del asistente
      setMensajes(prev => prev.map(m =>
        m.id === mensajeCargando.id
          ? { ...m, contenido: 'Error al conectar con el agente. Intenta de nuevo.', cargando: false }
          : m
      ))
    } finally {
      setEnviando(false)
      refInput.current?.focus()
    }
  }

  // Enviar con Enter (Shift+Enter = salto de línea)
  function manejarTecla(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensaje()
    }
  }

  // Preguntas sugeridas para facilitar el inicio de la conversación
  const SUGERENCIAS = [
    '¿Cómo están mis campañas hoy?',
    '¿Qué campaña tiene el mejor ROAS?',
    '¿Hay alguna anomalía que deba revisar?',
    '¿Qué puedo hacer para mejorar mi CPA?',
  ]

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Área de mensajes con scroll independiente */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mensajes.length === 0 ? (
          /* Estado vacío — pantalla de bienvenida con sugerencias */
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Asistente DivinADS</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-8">
              Hola, soy tu asistente IA especializado en Meta Ads. Puedo analizar tus campañas,
              detectar problemas y sugerir optimizaciones.
            </p>
            {/* Botones de sugerencias rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGERENCIAS.map(s => (
                <button
                  key={s}
                  onClick={() => setInputTexto(s)}
                  className="text-left px-4 py-3 rounded-xl bg-card border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Lista de mensajes de la conversación */
          mensajes.map(mensaje => (
            <div
              key={mensaje.id}
              className={cn(
                'flex gap-3',
                mensaje.rol === 'usuario' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar del emisor */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1',
                mensaje.rol === 'usuario'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-secondary/20 text-secondary'
              )}>
                {mensaje.rol === 'usuario'
                  ? <User className="w-4 h-4" aria-hidden="true" />
                  : <Bot className="w-4 h-4" aria-hidden="true" />
                }
              </div>

              {/* Burbuja de mensaje */}
              <div className={cn(
                'max-w-[75%] rounded-2xl px-4 py-3 text-sm',
                mensaje.rol === 'usuario'
                  ? 'bg-primary text-white rounded-tr-sm'
                  : 'bg-card border border-border text-foreground rounded-tl-sm'
              )}>
                {mensaje.cargando ? (
                  /* Indicador de escritura animado con tres puntos rebotando */
                  <div className="flex items-center gap-1 py-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  /* Contenido con soporte para saltos de línea */
                  <p className="whitespace-pre-wrap leading-relaxed">{mensaje.contenido}</p>
                )}

                {/* Hora del mensaje (solo visible cuando ya tiene contenido) */}
                {!mensaje.cargando && (
                  <p className={cn(
                    'text-xs mt-1',
                    mensaje.rol === 'usuario' ? 'text-white/60' : 'text-muted-foreground'
                  )}>
                    {format(mensaje.timestamp, 'HH:mm', { locale: es })}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
        {/* Ancla invisible para el auto-scroll */}
        <div ref={refFinalMensajes} />
      </div>

      {/* Barra de input fija en la parte inferior */}
      <div className="shrink-0 border-t border-border p-4">
        <div className="flex items-end gap-2 bg-card border border-border rounded-2xl px-4 py-3 focus-within:border-primary/50 transition-colors">
          <textarea
            ref={refInput}
            value={inputTexto}
            onChange={e => { setInputTexto(e.target.value); ajustarAlturaTextarea() }}
            onKeyDown={manejarTecla}
            placeholder="Pregunta algo sobre tus campañas..."
            className="flex-1 bg-transparent text-foreground text-sm resize-none outline-none placeholder:text-muted-foreground max-h-28 min-h-[20px]"
            rows={1}
            disabled={enviando}
            aria-label="Mensaje para el asistente"
          />
          <button
            onClick={enviarMensaje}
            disabled={!inputTexto.trim() || enviando}
            className={cn(
              'p-2 rounded-xl transition-all shrink-0',
              inputTexto.trim() && !enviando
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-muted/20 text-muted-foreground cursor-not-allowed'
            )}
            aria-label="Enviar mensaje"
          >
            {enviando
              ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              : <Send className="w-4 h-4" aria-hidden="true" />
            }
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          El asistente analiza tus campañas en tiempo real · Presiona Enter para enviar
        </p>
      </div>
    </div>
  )
}
