import { crearClienteServidor } from '@/lib/supabase/servidor'
import InterfazChat from '@/components/chat/InterfazChat'

// Server Component que pre-carga el historial antes de renderizar el cliente
export default async function PaginaChat() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()

  // Tipo local para mapear los mensajes del historial al formato del componente
  type MensajeHistorial = {
    id: string
    rol: 'usuario' | 'asistente'
    contenido: string
    timestamp: Date
  }

  let historialInicial: MensajeHistorial[] = []

  if (user) {
    // Recuperar los últimos 50 mensajes del historial en orden cronológico
    const { data: mensajes } = await supabase
      .from('conversation_messages')
      .select('id, rol, contenido, created_at')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50)

    // Transformar al formato que espera el componente de chat
    historialInicial = (mensajes ?? []).map(m => ({
      id: m.id,
      rol: m.rol as 'usuario' | 'asistente',
      contenido: m.contenido,
      timestamp: new Date(m.created_at),
    }))
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <InterfazChat historialInicial={historialInicial} />
    </div>
  )
}
