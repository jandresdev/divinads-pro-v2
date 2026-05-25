'use client'

import { useEffect } from 'react'
import Sidebar from './Sidebar'

// Props del menú móvil deslizante
interface PropsMenuMovil {
  abierto: boolean
  onCerrar: () => void
}

// Panel lateral deslizante para dispositivos móviles
export default function MenuMovil({ abierto, onCerrar }: PropsMenuMovil) {
  // Bloquear scroll del body cuando el menú está abierto
  useEffect(() => {
    if (abierto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    // Limpiar al desmontar
    return () => {
      document.body.style.overflow = ''
    }
  }, [abierto])

  // Cerrar con tecla Escape
  useEffect(() => {
    function manejarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && abierto) {
        onCerrar()
      }
    }

    document.addEventListener('keydown', manejarTecla)
    return () => document.removeEventListener('keydown', manejarTecla)
  }, [abierto, onCerrar])

  return (
    <>
      {/* Overlay semitransparente */}
      <div
        className={`
          fixed inset-0 z-40 bg-black/60 backdrop-blur-sm
          transition-opacity duration-300
          ${abierto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onCerrar}
        aria-hidden="true"
      />

      {/* Panel lateral deslizante desde la izquierda */}
      <div
        className={`
          fixed left-0 top-0 z-50 h-full
          transition-transform duration-300 ease-in-out
          ${abierto ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        <Sidebar onNavegar={onCerrar} />
      </div>
    </>
  )
}
