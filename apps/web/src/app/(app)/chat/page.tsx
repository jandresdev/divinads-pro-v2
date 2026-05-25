import { MessageSquare } from 'lucide-react'

// Página del Asistente IA — placeholder hasta los Pasos 22-24
export default function PaginaChat() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Asistente IA</h1>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary/20 text-secondary leading-none">
              BETA
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Consulta a tu asistente inteligente sobre tus campañas y métricas
          </p>
        </div>
      </div>

      {/* Estado vacío — se reemplazará con la UI de chat en el Paso 22 */}
      <div className="bg-card border border-border rounded-xl p-16 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-secondary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Próximamente
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm">
            El chat con IA se implementará en el Paso 22. Podrás hacer
            preguntas sobre tus campañas y recibir recomendaciones en tiempo real.
          </p>
        </div>
      </div>
    </div>
  )
}
