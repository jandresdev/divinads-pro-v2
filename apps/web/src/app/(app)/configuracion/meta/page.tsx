'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface EstadoConexion {
  configurada: boolean
  adAccountId: string | null
  configuradaDesde: string | null
  tokenExpiry: string | null
}

export default function PaginaConectarMeta() {
  const [accessToken, setAccessToken] = useState('')
  const [adAccountId, setAdAccountId] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [campañasEncontradas, setCampañasEncontradas] = useState(0)
  const [estado, setEstado] = useState<EstadoConexion | null>(null)
  const [cargandoEstado, setCargandoEstado] = useState(true)

  // Cargar estado actual de la conexión Meta
  useEffect(() => {
    fetch('/api/meta-config')
      .then(r => r.json())
      .then(json => {
        if (json.exito) setEstado(json.datos)
      })
      .catch(() => {})
      .finally(() => setCargandoEstado(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accessToken.trim() || !adAccountId.trim()) return
    setEnviando(true)
    setError('')

    try {
      const res = await fetch('/api/meta-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken.trim(),
          ad_account_id: adAccountId.trim(),
        }),
      })
      const json = await res.json()
      if (json.exito) {
        setExito(true)
        setCampañasEncontradas(json.datos?.totalCampañasEncontradas ?? 0)
        setEstado({
          configurada: true,
          adAccountId: json.datos?.adAccountId ?? adAccountId,
          configuradaDesde: new Date().toISOString(),
          tokenExpiry: null,
        })
      } else {
        setError(json.error ?? 'Error al conectar con Meta. Verifica tu token.')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Encabezado con navegación */}
      <div className="flex items-center gap-3">
        <Link
          href="/configuracion"
          className="p-2 rounded-lg hover:bg-card transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Volver a configuración"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conectar Meta Ads</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Vincula tu cuenta publicitaria de Facebook e Instagram
          </p>
        </div>
      </div>

      {/* Estado de conexión actual */}
      {cargandoEstado ? (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Verificando conexión…</span>
        </div>
      ) : estado?.configurada ? (
        <div className="bg-success/5 border border-success/20 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Meta Ads conectado</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cuenta: <span className="font-mono">{estado.adAccountId}</span>
            </p>
            {estado.configuradaDesde && (
              <p className="text-xs text-muted-foreground">
                Conectado el {new Date(estado.configuradaDesde).toLocaleDateString('es-ES')}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            No hay ninguna cuenta de Meta Ads conectada. Sigue los pasos a continuación.
          </p>
        </div>
      )}

      {/* Instrucciones */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">¿Cómo obtener tu Access Token?</h2>
        <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
          <li>
            Ve al{' '}
            <a
              href="https://developers.facebook.com/tools/explorer/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Graph API Explorer
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>Selecciona tu app en el menú superior y haz clic en <strong className="text-foreground">Generate Access Token</strong></li>
          <li>Agrega los permisos: <code className="bg-background px-1 rounded text-xs">ads_read</code>, <code className="bg-background px-1 rounded text-xs">ads_management</code>, <code className="bg-background px-1 rounded text-xs">read_insights</code></li>
          <li>Copia el token generado y pégalo a continuación</li>
          <li>Tu Ad Account ID lo encuentras en Meta Ads Manager → inicio (formato: <code className="bg-background px-1 rounded text-xs">act_123456789</code>)</li>
        </ol>
      </div>

      {/* Formulario de conexión */}
      {exito ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Conexión exitosa</h3>
          <p className="text-muted-foreground text-sm">
            Se encontraron <strong className="text-foreground">{campañasEncontradas} campañas</strong> en tu cuenta.
            La sincronización de métricas comenzará en los próximos 15 minutos.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors mt-2"
          >
            Ir al Dashboard
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="access-token" className="block text-sm font-medium text-foreground mb-1.5">
                Access Token de Meta
              </label>
              <textarea
                id="access-token"
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                placeholder="EAAxxxxxxxxxx..."
                rows={3}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Genera un token de larga duración para evitar reconfigurar frecuentemente.
              </p>
            </div>

            <div>
              <label htmlFor="ad-account-id" className="block text-sm font-medium text-foreground mb-1.5">
                ID de Cuenta Publicitaria
              </label>
              <input
                id="ad-account-id"
                type="text"
                value={adAccountId}
                onChange={e => setAdAccountId(e.target.value)}
                placeholder="act_123456789 ó 123456789"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                required
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Link
                href="/configuracion"
                className="flex-1 py-2.5 border border-border rounded-lg text-sm text-center text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={enviando || !accessToken.trim() || !adAccountId.trim()}
                className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                {enviando ? 'Validando…' : 'Conectar cuenta'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
