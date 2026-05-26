'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, Plus, RefreshCw,
  ExternalLink, BarChart3, Megaphone, Wallet,
} from 'lucide-react'
import { formatearMoneda } from '@/lib/utils'
import SinConexionMeta from '@/components/SinConexionMeta'

interface CuentaMeta {
  id: string
  meta_account_id: string
  nombre_cuenta: string | null
  configurada: boolean
  configurada_desde: string | null
}

interface EstadisticasCuenta {
  campanias: number
  gastoMes: number
  roasPromedio: number
}

export default function PaginaCuentasCliente() {
  const [cuenta, setCuenta] = useState<CuentaMeta | null>(null)
  const [stats, setStats] = useState<EstadisticasCuenta | null>(null)
  const [cargando, setCargando] = useState(true)
  const [sinConexion, setSinConexion] = useState(false)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      try {
        const [resCuenta, resMetricas, resCampanias] = await Promise.all([
          fetch('/api/meta-config'),
          fetch('/api/metricas'),
          fetch('/api/campanias'),
        ])
        const jsonCuenta = await resCuenta.json()
        const jsonMetricas = await resMetricas.json()
        const jsonCampanias = await resCampanias.json()

        if (jsonCuenta.exito && jsonCuenta.datos?.configurada) {
          setCuenta({
            id: 'real',
            meta_account_id: jsonCuenta.datos.adAccountId ?? 'act_desconocido',
            nombre_cuenta: jsonCuenta.datos.nombreCuenta ?? null,
            configurada: true,
            configurada_desde: jsonCuenta.datos.configuradaDesde,
          })

          const d = jsonMetricas.exito && jsonMetricas.datos ? jsonMetricas.datos : null
          const totalCampanias = jsonCampanias.exito ? (jsonCampanias.meta?.total ?? jsonCampanias.datos?.length ?? 0) : 0
          setStats({
            campanias: totalCampanias,
            gastoMes: d?.gasto ?? 0,
            roasPromedio: d?.roas ?? 0,
          })
        } else {
          setSinConexion(true)
        }
      } catch {
        setSinConexion(true)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cuentas</h1>
          <p className="text-muted-foreground text-sm mt-1">Cuentas publicitarias de Meta Ads conectadas</p>
        </div>
        <Link
          href="/configuracion/meta"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {sinConexion ? 'Conectar cuenta' : 'Reconfigurar'}
        </Link>
      </div>

      {cargando ? (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl h-40 animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="bg-card border border-border rounded-xl h-24 animate-pulse" />)}
          </div>
        </div>
      ) : sinConexion ? (
        <SinConexionMeta mensaje="Conecta tu cuenta de Meta Ads para ver el estado de tus cuentas publicitarias." />
      ) : cuenta ? (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1877F2]/10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="#1877F2" className="w-6 h-6">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-foreground">Meta Ads</h2>
                    <span className="flex items-center gap-1 text-xs font-medium text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />Conectada
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">{cuenta.nombre_cuenta ?? cuenta.meta_account_id}</p>
                  {cuenta.configurada_desde && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Conectada el {new Date(cuenta.configurada_desde).toLocaleDateString('es-ES', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href="https://adsmanager.facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />Abrir en Meta
                </a>
                <Link
                  href="/configuracion/meta"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />Reconfigurar
                </Link>
              </div>
            </div>

            {/* Aviso de renovación cuando el token de OAuth esté próximo a expirar (60 días) */}
          </div>

          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Megaphone className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Campañas activas</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.campanias}</p>
                <Link href="/campanias" className="text-xs text-primary hover:underline mt-1 inline-block">
                  Ver campañas →
                </Link>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-green-400/10">
                    <Wallet className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Gasto este mes</p>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {stats.gastoMes > 0 ? formatearMoneda(stats.gastoMes) : '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Últimos 30 días</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-indigo-400/10">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">ROAS promedio</p>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {stats.roasPromedio > 0 ? `${stats.roasPromedio.toFixed(1).replace('.', ',')}x` : '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Últimos 30 días</p>
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Permisos de API activos</h3>
            <div className="flex flex-wrap gap-2">
              {['ads_read', 'ads_management', 'read_insights', 'business_management'].map(permiso => (
                <span key={permiso} className="flex items-center gap-1 text-xs font-mono bg-success/5 border border-success/20 text-success px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />{permiso}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
