// Página pública de precios — Server Component (no requiere autenticación)

const PLANES = [
  {
    nombre: 'Gratuito',
    precio: 0,
    descripcion: 'Para empezar a explorar DivinADS',
    caracteristicas: [
      '1 cuenta de Meta Ads',
      'Dashboard de métricas básico',
      'Hasta 5 campañas monitoreadas',
      'Alertas de anomalías (máx. 3)',
      'Soporte por email',
    ],
    cta: 'Comenzar gratis',
    destacado: false,
    priceId: null,
  },
  {
    nombre: 'Pro',
    precio: 99,
    descripcion: 'Para equipos de marketing serios',
    caracteristicas: [
      '3 cuentas de Meta Ads',
      'Dashboard completo en tiempo real',
      'Campañas ilimitadas',
      'Agente IA autónomo 24/7',
      'Alertas ilimitadas',
      'Chat con el asistente IA',
      'Predicciones ML de ROAS',
      'Soporte prioritario',
    ],
    cta: 'Empezar con Pro',
    destacado: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
  },
  {
    nombre: 'Enterprise',
    precio: 299,
    descripcion: 'Para agencias y equipos grandes',
    caracteristicas: [
      'Cuentas de Meta ilimitadas',
      'Todo lo de Pro',
      'Multi-tenant para clientes',
      'API acceso completo',
      'Manager de cuenta dedicado',
      'SLA 99.9% uptime',
      'Onboarding personalizado',
    ],
    cta: 'Contactar ventas',
    destacado: false,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE,
  },
]

export default function PaginaPrecios() {
  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Encabezado de la sección */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">Planes y Precios</h1>
          <p className="text-lg text-muted-foreground">
            Empieza gratis. Escala cuando estés listo.
          </p>
        </div>

        {/* Grid de tarjetas de planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANES.map(plan => (
            <div
              key={plan.nombre}
              className={`relative rounded-2xl p-8 border ${
                plan.destacado
                  ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10'
                  : 'bg-card border-border'
              }`}
            >
              {/* Badge "Más popular" para el plan destacado */}
              {plan.destacado && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-primary text-white text-xs font-semibold rounded-full">
                    Más popular
                  </span>
                </div>
              )}

              {/* Nombre y descripción del plan */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">{plan.nombre}</h2>
                <p className="text-muted-foreground text-sm mt-1">{plan.descripcion}</p>
              </div>

              {/* Precio mensual */}
              <div className="mb-8">
                <span className="text-4xl font-bold text-foreground">${plan.precio}</span>
                {plan.precio > 0 && (
                  <span className="text-muted-foreground text-sm ml-1">/mes USD</span>
                )}
              </div>

              {/* Lista de características incluidas */}
              <ul className="space-y-3 mb-8">
                {plan.caracteristicas.map(caracteristica => (
                  <li
                    key={caracteristica}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <span className="text-primary mt-0.5" aria-hidden="true">✓</span>
                    {caracteristica}
                  </li>
                ))}
              </ul>

              {/* Botón de llamada a la acción */}
              <a
                href="/auth/registrarse"
                className={`block w-full text-center py-3 rounded-xl font-medium transition-all ${
                  plan.destacado
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'border border-border text-foreground hover:border-primary/30 hover:bg-background'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Sección de contacto al pie */}
        <div className="mt-20 text-center">
          <p className="text-muted-foreground">
            ¿Tienes preguntas?{' '}
            <a href="mailto:hola@divinads.com" className="text-primary hover:underline">
              Contáctanos
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
