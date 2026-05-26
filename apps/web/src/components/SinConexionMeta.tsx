import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

interface PropsSinConexionMeta {
  mensaje?: string
}

export default function SinConexionMeta({ mensaje }: PropsSinConexionMeta) {
  return (
    <div className="bg-card border border-border rounded-xl p-16 text-center">
      <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-7 h-7 text-warning" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Cuenta Meta Ads no conectada</h2>
      <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
        {mensaje ?? 'Conecta tu cuenta de Meta Ads para ver los datos de este módulo en tiempo real.'}
      </p>
      <Link
        href="/configuracion/meta"
        className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Conectar Meta Ads
      </Link>
    </div>
  )
}
