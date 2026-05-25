import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Autenticación | DivinADS',
  description: 'Inicia sesión o regístrate en DivinADS',
}

// Layout compartido para todas las páginas de autenticación
export default function LayoutAutenticacion({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Panel izquierdo - Ilustración/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-secondary/10 to-background items-center justify-center p-12">
        <div className="max-w-md text-center space-y-8">
          {/* Logo */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              DivinADS
            </h1>
            <p className="text-muted-foreground text-lg">
              Tu agente de IA para Meta Ads
            </p>
          </div>

          {/* Features highlights */}
          <div className="space-y-4 text-left">
            {[
              { icono: '🤖', texto: 'Agente autónomo que ejecuta decisiones 10x/día' },
              { icono: '📊', texto: 'Dashboard en tiempo real con 6 KPIs clave' },
              { icono: '🚨', texto: 'Alertas inmediatas de caídas de ROAS y CPC alto' },
              { icono: '💬', texto: 'Chat natural con tu agente en español' },
              { icono: '🇱🇦', texto: 'Especializado en mercados LATAM' },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-foreground/80">
                <span className="text-2xl">{feature.icono}</span>
                <span className="text-sm">{feature.texto}</span>
              </div>
            ))}
          </div>

          {/* Precio */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-muted-foreground text-sm">Desde</p>
            <p className="text-3xl font-bold text-foreground">$99<span className="text-lg font-normal text-muted-foreground">/mes</span></p>
            <p className="text-muted-foreground text-sm mt-1">Plan Pro · Sin contratos</p>
          </div>
        </div>
      </div>

      {/* Panel derecho - Formulario */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo en mobile */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              DivinADS
            </h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
