'use client'

import { useState } from 'react'
import Link from 'next/link'
import { crearClienteNavegador } from '@/lib/supabase/cliente'

export default function PaginaRegistrarse() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [contraseña, setContraseña] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exitoso, setExitoso] = useState(false)

  const supabase = crearClienteNavegador()

  async function manejarRegistro(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)
    setError(null)

    if (contraseña !== confirmacion) {
      setError('Las contraseñas no coinciden.')
      setCargando(false)
      return
    }

    if (contraseña.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      setCargando(false)
      return
    }

    try {
      const { error: errorAuth } = await supabase.auth.signUp({
        email,
        password: contraseña,
        options: {
          data: {
            name: nombre,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (errorAuth) {
        const msg = errorAuth.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('user already exists')) {
          setError('Este email ya está registrado. ¿Quieres iniciar sesión?')
        } else if (msg.includes('signups not allowed') || msg.includes('signup is disabled')) {
          setError('El registro está temporalmente deshabilitado. Contacta al administrador.')
        } else if (msg.includes('invalid email')) {
          setError('El correo electrónico no es válido.')
        } else if (msg.includes('password')) {
          setError('La contraseña no cumple los requisitos mínimos de seguridad.')
        } else if (msg.includes('rate limit') || msg.includes('too many')) {
          setError('Demasiados intentos. Espera unos minutos e intenta de nuevo.')
        } else {
          setError(`Error al crear la cuenta: ${errorAuth.message}`)
        }
        return
      }

      setExitoso(true)
    } finally {
      setCargando(false)
    }
  }

  if (exitoso) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">¡Casi listo!</h2>
          <p className="text-muted-foreground">
            Te enviamos un email de confirmación a <strong className="text-foreground">{email}</strong>.
          </p>
          <p className="text-muted-foreground text-sm">
            Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
          </p>
        </div>
        <Link
          href="/auth/iniciar-sesion"
          className="inline-block px-6 py-2 text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors"
        >
          Ir a inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">Crea tu cuenta</h2>
        <p className="text-muted-foreground">Comienza gratis, sin tarjeta de crédito</p>
      </div>

      <form onSubmit={manejarRegistro} className="space-y-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="nombre" className="block text-sm font-medium text-foreground">
            Nombre completo
          </label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Juan García"
            required
            className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

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

        <div className="space-y-2">
          <label htmlFor="contraseña" className="block text-sm font-medium text-foreground">
            Contraseña
          </label>
          <input
            id="contraseña"
            type="password"
            value={contraseña}
            onChange={(e) => setContraseña(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
            className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmacion" className="block text-sm font-medium text-foreground">
            Confirmar contraseña
          </label>
          <input
            id="confirmacion"
            type="password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={cargando}
          className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cargando ? 'Creando cuenta...' : 'Crear cuenta gratis'}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Al registrarte aceptas nuestros{' '}
          <Link href="/terminos" className="text-primary hover:underline">Términos de Servicio</Link>
          {' '}y{' '}
          <Link href="/privacidad" className="text-primary hover:underline">Política de Privacidad</Link>
        </p>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link href="/auth/iniciar-sesion" className="text-primary hover:text-primary/80 transition-colors font-medium">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
