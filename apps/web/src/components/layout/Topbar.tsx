'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Menu, Bell, LogOut, ChevronDown } from 'lucide-react'
import { crearClienteNavegador } from '@/lib/supabase/cliente'
import MenuMovil from './MenuMovil'

// Datos del usuario autenticado pasados desde el Server Component
interface DatosUsuario {
  email: string
  nombre?: string
}

interface PropsTopbar {
  usuario: DatosUsuario
}

// Mapa de rutas a títulos en español
const TITULOS_RUTAS: Record<string, string> = {
  '/dashboard': 'Panel de Control',
  '/campanias': 'Campañas',
  '/analiticas': 'Analíticas',
  '/chat': 'Asistente IA',
  '/configuracion': 'Configuración',
}

// Obtiene el título de la página según la ruta actual
function obtenerTituloPagina(ruta: string): string {
  // Buscar coincidencia exacta primero
  if (TITULOS_RUTAS[ruta]) return TITULOS_RUTAS[ruta]

  // Buscar por prefijo
  for (const [clave, titulo] of Object.entries(TITULOS_RUTAS)) {
    if (ruta.startsWith(clave)) return titulo
  }

  return 'DivinADS'
}

// Obtiene la inicial del usuario para el avatar
function obtenerInicial(usuario: DatosUsuario): string {
  if (usuario.nombre) return usuario.nombre.charAt(0).toUpperCase()
  if (usuario.email) return usuario.email.charAt(0).toUpperCase()
  return 'U'
}

// Barra superior con hamburguesa (móvil), título, plan, notificaciones y avatar
export default function Topbar({ usuario }: PropsTopbar) {
  const router = useRouter()
  const rutaActual = usePathname()

  // Estado del menú móvil
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false)

  // Estado del dropdown de usuario
  const [dropdownAbierto, setDropdownAbierto] = useState(false)
  const refDropdown = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function manejarClickFuera(evento: MouseEvent) {
      if (refDropdown.current && !refDropdown.current.contains(evento.target as Node)) {
        setDropdownAbierto(false)
      }
    }

    document.addEventListener('mousedown', manejarClickFuera)
    return () => document.removeEventListener('mousedown', manejarClickFuera)
  }, [])

  // Cerrar sesión y redirigir al login
  async function cerrarSesion() {
    const supabase = crearClienteNavegador()
    await supabase.auth.signOut()
    router.push('/auth/iniciar-sesion')
  }

  const tituloPagina = obtenerTituloPagina(rutaActual)
  const inicial = obtenerInicial(usuario)

  return (
    <>
      {/* Barra superior */}
      <header className="flex items-center justify-between h-14 px-4 md:px-6 bg-card border-b border-border shrink-0">
        {/* Izquierda: hamburguesa (solo móvil) + título */}
        <div className="flex items-center gap-3">
          {/* Botón hamburguesa — visible solo en móvil */}
          <button
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
            onClick={() => setMenuMovilAbierto(true)}
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Título de la página actual */}
          <h1 className="text-base font-semibold text-foreground">
            {tituloPagina}
          </h1>
        </div>

        {/* Derecha: plan + notificaciones + avatar */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Badge del plan actual */}
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            Gratuito
          </span>

          {/* Botón de notificaciones */}
          <button
            className="relative p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
            aria-label="Ver notificaciones"
          >
            <Bell className="w-5 h-5" aria-hidden="true" />
            {/* Badge rojo de alerta — mostrar cuando haya notificaciones sin leer */}
            <span
              className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"
              aria-label="Tienes notificaciones sin leer"
            />
          </button>

          {/* Avatar con dropdown de usuario */}
          <div className="relative" ref={refDropdown}>
            <button
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-background/80 transition-colors"
              onClick={() => setDropdownAbierto(!dropdownAbierto)}
              aria-label="Abrir menú de usuario"
              aria-expanded={dropdownAbierto}
              aria-haspopup="true"
            >
              {/* Círculo con inicial */}
              <div
                className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-sm font-semibold"
                aria-hidden="true"
              >
                {inicial}
              </div>
              <ChevronDown
                className={`hidden md:block w-4 h-4 text-muted-foreground transition-transform duration-150 ${
                  dropdownAbierto ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {/* Dropdown de usuario */}
            {dropdownAbierto && (
              <div className="absolute right-0 mt-1 w-56 bg-card border border-border rounded-xl shadow-lg py-1 z-30">
                {/* Info del usuario */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-medium text-foreground truncate">
                    {usuario.nombre || 'Usuario'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {usuario.email}
                  </p>
                </div>

                {/* Acción de cerrar sesión */}
                <button
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                  onClick={cerrarSesion}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Menú móvil deslizante (gestionado desde Topbar porque requiere estado) */}
      <MenuMovil
        abierto={menuMovilAbierto}
        onCerrar={() => setMenuMovilAbierto(false)}
      />
    </>
  )
}
