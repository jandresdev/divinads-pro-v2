'use client'

// Página de configuración con tabs laterales — Client Component (usa useState)
import { useState } from 'react'
import { User, Link2, Bell, CreditCard, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Tipos de secciones disponibles en la configuración
type SeccionConfig = 'perfil' | 'integraciones' | 'notificaciones' | 'facturacion'

// Definición de las secciones del menú lateral
const SECCIONES: { id: SeccionConfig; label: string; icono: React.ElementType }[] = [
  { id: 'perfil', label: 'Perfil', icono: User },
  { id: 'integraciones', label: 'Integraciones', icono: Link2 },
  { id: 'notificaciones', label: 'Notificaciones', icono: Bell },
  { id: 'facturacion', label: 'Facturación', icono: CreditCard },
]

// Preferencias de notificación con estado inicial
const NOTIFICACIONES_INICIALES = [
  {
    label: 'Alertas críticas de ROAS',
    desc: 'Cuando el ROAS caiga más del 25%',
    activo: true,
  },
  {
    label: 'Resumen diario',
    desc: 'Email con el resumen de métricas del día',
    activo: true,
  },
  {
    label: 'Anomalías detectadas',
    desc: 'Notificación cuando el agente detecte un problema',
    activo: false,
  },
  {
    label: 'Acciones del agente',
    desc: 'Cuando el agente ejecute una acción automática',
    activo: true,
  },
]

export default function PaginaConfiguracion() {
  const [seccionActiva, setSeccionActiva] = useState<SeccionConfig>('perfil')
  const [guardado, setGuardado] = useState(false)
  // Estado local de las preferencias de notificación
  const [notificaciones, setNotificaciones] = useState(NOTIFICACIONES_INICIALES)

  // Simula el guardado de cambios con feedback visual temporal
  function simularGuardar() {
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  // Alterna el estado activo de una notificación por índice
  function toggleNotificacion(indice: number) {
    setNotificaciones(prev =>
      prev.map((notif, i) =>
        i === indice ? { ...notif, activo: !notif.activo } : notif
      )
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Encabezado de la página */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestiona tu cuenta y preferencias</p>
      </div>

      <div className="flex gap-6">
        {/* Menú lateral de navegación entre secciones */}
        <nav className="shrink-0 w-48 space-y-1" aria-label="Secciones de configuración">
          {SECCIONES.map(seccion => {
            const Icono = seccion.icono
            return (
              <button
                key={seccion.id}
                onClick={() => setSeccionActiva(seccion.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  seccionActiva === seccion.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background'
                )}
                aria-current={seccionActiva === seccion.id ? 'page' : undefined}
              >
                <Icono className="w-4 h-4" aria-hidden="true" />
                {seccion.label}
              </button>
            )
          })}
        </nav>

        {/* Panel de contenido para la sección activa */}
        <div className="flex-1 bg-card border border-border rounded-xl p-6">

          {/* ── Sección: Perfil ── */}
          {seccionActiva === 'perfil' && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold text-foreground">
                Información del Perfil
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1.5">
                    Nombre
                  </label>
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-1.5">
                    Empresa
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre de tu empresa"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm text-muted-foreground block mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 opacity-60 cursor-not-allowed"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    El email no se puede cambiar
                  </p>
                </div>
              </div>

              {/* Botón con feedback de éxito al guardar */}
              <button
                onClick={simularGuardar}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors"
              >
                {guardado && <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                {guardado ? 'Guardado' : 'Guardar cambios'}
              </button>
            </div>
          )}

          {/* ── Sección: Integraciones ── */}
          {seccionActiva === 'integraciones' && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold text-foreground">Integraciones</h2>

              {/* Tarjeta de conexión con Meta Ads */}
              <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  {/* Logo de Meta */}
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <span className="text-blue-400 font-bold text-sm" aria-hidden="true">
                      f
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Meta Ads</p>
                    <p className="text-xs text-muted-foreground">
                      Conectar tu cuenta publicitaria de Facebook/Instagram
                    </p>
                  </div>
                </div>
                <button className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                  Conectar
                </button>
              </div>

              {/* Espacio para futuras integraciones (Google Ads, TikTok Ads, etc.) */}
              <p className="text-xs text-muted-foreground text-center py-4">
                Más integraciones próximamente
              </p>
            </div>
          )}

          {/* ── Sección: Notificaciones ── */}
          {seccionActiva === 'notificaciones' && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold text-foreground">
                Preferencias de Notificaciones
              </h2>

              {notificaciones.map((notif, indice) => (
                <div key={notif.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{notif.label}</p>
                    <p className="text-xs text-muted-foreground">{notif.desc}</p>
                  </div>

                  {/* Toggle de activación/desactivación */}
                  <button
                    onClick={() => toggleNotificacion(indice)}
                    className={cn(
                      'w-10 h-6 rounded-full transition-colors relative shrink-0',
                      notif.activo ? 'bg-primary' : 'bg-border'
                    )}
                    aria-label={`${notif.activo ? 'Desactivar' : 'Activar'} ${notif.label}`}
                    aria-pressed={notif.activo}
                  >
                    <span
                      className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
                        notif.activo ? 'translate-x-5' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Sección: Facturación ── */}
          {seccionActiva === 'facturacion' && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold text-foreground">Facturación</h2>

              {/* Estado actual del plan */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-sm font-medium text-foreground">
                  Plan actual:{' '}
                  <span className="text-primary">Gratuito</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Actualiza para desbloquear el agente IA y más funcionalidades
                </p>
              </div>

              {/* Enlace a la página de precios */}
              <a
                href="/precios"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors"
              >
                Ver planes disponibles
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
