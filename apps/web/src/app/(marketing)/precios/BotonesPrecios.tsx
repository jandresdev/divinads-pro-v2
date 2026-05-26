'use client'

import { useState } from 'react'

interface PropsBotones {
  plan: string
  precio: number
  cta: string
  destacado: boolean
}

export default function BotonPlan({ plan, precio, cta, destacado }: PropsBotones) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  // Enterprise: enlace directo a ventas
  if (precio === 299) {
    return (
      <a
        href="mailto:ventas@divinads.com"
        className={`block w-full text-center py-3 rounded-xl font-medium transition-all ${
          destacado
            ? 'bg-primary text-white hover:bg-primary/90'
            : 'border border-border text-foreground hover:border-primary/30 hover:bg-background'
        }`}
      >
        {cta}
      </a>
    )
  }

  // Plan gratuito: ir a registro
  if (precio === 0) {
    return (
      <a
        href="/auth/registrarse"
        className="block w-full text-center py-3 rounded-xl font-medium transition-all border border-border text-foreground hover:border-primary/30 hover:bg-background"
      >
        {cta}
      </a>
    )
  }

  // Plan de pago: Stripe checkout
  async function iniciarCheckout() {
    setCargando(true)
    setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const json = await res.json()
      if (json.exito && json.url) {
        window.location.href = json.url
      } else {
        setError(json.error ?? 'Error al iniciar el pago. Intenta de nuevo.')
        setCargando(false)
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setCargando(false)
    }
  }

  return (
    <div>
      <button
        onClick={iniciarCheckout}
        disabled={cargando}
        className={`w-full py-3 rounded-xl font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
          destacado
            ? 'bg-primary text-white hover:bg-primary/90'
            : 'border border-border text-foreground hover:border-primary/30 hover:bg-background'
        }`}
      >
        {cargando ? 'Redirigiendo…' : cta}
      </button>
      {error && (
        <p className="text-xs text-destructive mt-2 text-center">{error}</p>
      )}
    </div>
  )
}
