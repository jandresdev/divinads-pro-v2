import Link from 'next/link'

export default function PaginaPrivacidad() {
  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-invert">
        <h1 className="text-3xl font-bold text-foreground mb-2">Política de Privacidad</h1>
        <p className="text-muted-foreground text-sm mb-8">Última actualización: mayo de 2026</p>

        <div className="space-y-6 text-muted-foreground text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Datos que recopilamos</h2>
            <p>Recopilamos: correo electrónico, nombre, métricas de campañas de Meta Ads, e información de uso de la plataforma. No vendemos datos a terceros.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Uso de los datos</h2>
            <p>Usamos tus datos para operar la plataforma, generar insights de IA, procesar pagos vía Stripe, y mejorar el servicio.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Seguridad</h2>
            <p>Tus datos se almacenan en Supabase (PostgreSQL) con cifrado en reposo. Implementamos Row-Level Security (RLS) para aislamiento completo entre tenants.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Cookies</h2>
            <p>Usamos cookies de sesión de Supabase Auth para mantenerte autenticado. No usamos cookies de rastreo de terceros.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Tus derechos</h2>
            <p>Puedes solicitar la eliminación de tu cuenta y datos en cualquier momento escribiendo a <a href="mailto:privacidad@divinads.com" className="text-primary hover:underline">privacidad@divinads.com</a></p>
          </section>
        </div>

        <div className="mt-10">
          <Link href="/auth/registrarse" className="text-primary hover:underline text-sm">
            ← Volver al registro
          </Link>
        </div>
      </div>
    </div>
  )
}
