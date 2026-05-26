import Link from 'next/link'

export default function PaginaTerminos() {
  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-invert">
        <h1 className="text-3xl font-bold text-foreground mb-2">Términos de Servicio</h1>
        <p className="text-muted-foreground text-sm mb-8">Última actualización: mayo de 2026</p>

        <div className="space-y-6 text-muted-foreground text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Aceptación de los términos</h2>
            <p>Al acceder y usar DivinADS, aceptas estos Términos de Servicio. Si no estás de acuerdo, no uses la plataforma.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Descripción del servicio</h2>
            <p>DivinADS es una plataforma SaaS para la automatización y optimización de campañas de Meta Ads mediante inteligencia artificial.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Uso aceptable</h2>
            <p>Te comprometes a usar DivinADS solo para fines legítimos de marketing digital y a no violar las políticas de Meta Ads.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Limitación de responsabilidad</h2>
            <p>DivinADS no garantiza resultados específicos de campañas. Las decisiones autónomas del agente IA son recomendaciones basadas en datos históricos.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Contacto</h2>
            <p>Para consultas sobre estos términos escríbenos a <a href="mailto:legal@divinads.com" className="text-primary hover:underline">legal@divinads.com</a></p>
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
