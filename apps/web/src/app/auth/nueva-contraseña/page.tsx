'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { crearClienteNavegador } from '@/lib/supabase/cliente'

export default function PaginaNuevaContraseña() {
  const router = useRouter()
  const [contraseña, setContraseña] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [cargando, setCargando] = useState(false)
  const [exitoso, setExitoso] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sesionLista, setSesionLista] = useState(false)

  const supabase = crearClienteNavegador()

  // Supabase redirige aquí con tokens en el hash — escuchar el evento de sesión
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') {
        setSesionLista(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  async function manejarCambio(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (contraseña !== confirmacion) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (contraseña.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setCargando(true)
    const { error: errorAuth } = await supabase.auth.updateUser({ password: contraseña })
    setCargando(false)

    if (errorAuth) {
      setError('Error al actualizar la contraseña. El enlace puede haber expirado.')
    } else {
      setExitoso(true)
      setTimeout(() => router.push('/auth/iniciar-sesion'), 3000)
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
          <h2 className="text-2xl font-bold text-foreground">Contraseña actualizada</h2>
          <p className="text-muted-foreground">
            Tu contraseña fue cambiada exitosamente. Redirigiendo al inicio de sesión…
          </p>
        </div>
        <Link
          href="/auth/iniciar-sesion"
          className="inline-block text-primary hover:underline text-sm"
        >
          Ir ahora
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">Nueva contraseña</h2>
        <p className="text-muted-foreground">Elige una contraseña segura para tu cuenta</p>
      </div>

      {!sesionLista && (
        <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-warning text-sm text-center">
          Procesando tu enlace de recuperación…
        </div>
      )}

      <form onSubmit={manejarCambio} className="space-y-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="contraseña" className="block text-sm font-medium text-foreground">
            Nueva contraseña
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
          disabled={cargando || !sesionLista}
          className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cargando ? 'Guardando…' : 'Guardar nueva contraseña'}
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
