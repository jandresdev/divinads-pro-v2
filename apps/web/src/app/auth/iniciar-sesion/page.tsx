'use client'

import { useState } from 'react'
import Link from 'next/link'
import { crearClienteNavegador } from '@/lib/supabase/cliente'

export default function PaginaIniciarSesion() {
  const [email, setEmail] = useState('')
  const [contraseña, setContraseña] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = crearClienteNavegador()

  async function manejarInicioSesion(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)
    setError(null)

    try {
      const { error: errorAuth } = await supabase.auth.signInWithPassword({
        email,
        password: contraseña,
      })

      if (errorAuth) {
        // Mensajes de error en español
        if (errorAuth.message.includes('Invalid login credentials')) {
          setError('Email o contraseña incorrectos. Verifica tus datos.')
        } else if (errorAuth.message.includes('Email not confirmed')) {
          setError('Debes confirmar tu email antes de iniciar sesión.')
        } else {
          setError('Error al iniciar sesión. Intenta de nuevo.')
        }
        return
      }

      // Redirección dura para que el middleware lea la cookie de sesión correctamente
      window.location.href = '/dashboard'
    } finally {
      setCargando(false)
    }
  }

  async function iniciarSesionConFacebook() {
    setCargando(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) setError('Error al conectar con Facebook.')
    setCargando(false)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">Bienvenido de vuelta</h2>
        <p className="text-muted-foreground">Ingresa a tu cuenta de DivinADS</p>
      </div>

      {/* Botón de Facebook */}
      <button
        onClick={iniciarSesionConFacebook}
        disabled={cargando}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#1877F2] text-white rounded-lg font-medium hover:bg-[#166FE5] transition-colors disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        Continuar con Facebook
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">o con email</span>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={manejarInicioSesion} className="space-y-4">
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="contraseña" className="block text-sm font-medium text-foreground">
              Contraseña
            </label>
            <Link
              href="/auth/olvide-contraseña"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            id="contraseña"
            type="password"
            value={contraseña}
            onChange={(e) => setContraseña(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={cargando}
          className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{' '}
        <Link href="/auth/registrarse" className="text-primary hover:text-primary/80 transition-colors font-medium">
          Regístrate gratis
        </Link>
      </p>
    </div>
  )
}
