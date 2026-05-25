'use client'

import { useState } from 'react'
import Link from 'next/link'
import { crearClienteNavegador } from '@/lib/supabase/cliente'

export default function PaginaOlvideContraseña() {
  const [email, setEmail] = useState('')
  const [cargando, setCargando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = crearClienteNavegador()

  async function manejarRecuperacion(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)
    setError(null)

    const { error: errorAuth } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/nueva-contraseña`,
    })

    if (errorAuth) {
      setError('Error al enviar el correo. Verifica el email ingresado.')
    } else {
      setEnviado(true)
    }

    setCargando(false)
  }

  if (enviado) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Revisa tu email</h2>
          <p className="text-muted-foreground">
            Enviamos las instrucciones para restablecer tu contraseña a <strong className="text-foreground">{email}</strong>
          </p>
        </div>
        <Link href="/auth/iniciar-sesion" className="inline-block text-primary hover:underline">
          Volver al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">Recuperar contraseña</h2>
        <p className="text-muted-foreground">Te enviaremos las instrucciones por email</p>
      </div>

      <form onSubmit={manejarRecuperacion} className="space-y-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@empresa.com"
            required
            className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={cargando}
          className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {cargando ? 'Enviando...' : 'Enviar instrucciones'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/iniciar-sesion" className="text-primary hover:text-primary/80 transition-colors">
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  )
}
