// Página principal - Redirige al dashboard si autenticado, sino a login
import { redirect } from 'next/navigation'

export default function HomePage() {
  // Por ahora muestra landing básica
  // TODO: Verificar sesión y redirigir
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          DivinADS
        </h1>
        <p className="text-xl text-muted-foreground">
          Automatización Inteligente de Meta Ads para LATAM
        </p>
        <p className="text-muted-foreground">
          Tu agente IA ejecuta decisiones 10x/día y mejora cada semana
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <a
            href="/auth/iniciar-sesion"
            className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Iniciar Sesión
          </a>
          <a
            href="/auth/registrarse"
            className="px-6 py-3 border border-border text-foreground rounded-lg font-medium hover:bg-card transition-colors"
          >
            Registrarse
          </a>
        </div>
      </div>
    </main>
  )
}
