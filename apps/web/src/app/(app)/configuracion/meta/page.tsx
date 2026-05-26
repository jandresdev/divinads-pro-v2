'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

interface EstadoConexion {
  configurada: boolean
  adAccountId: string | null
  configuradaDesde: string | null
  tokenExpiry: string | null
}

export default function PaginaConectarMeta() {
  const searchParams = useSearchParams()
  const exito = searchParams.get('exito') === '1'
  const errorOAuth = searchParams.get('error')

  const [accessToken, setAccessToken] = useState('')
  const [adAccountId, setAdAccountId] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(
    errorOAuth === 'oauth_cancelado' ? 'Conectar con Meta fue cancelado.'
    : errorOAuth === 'sesion_expirada' ? 'La sesión expiró. Intenta de nuevo.'
    : errorOAuth === 'sin_cuentas' ? 'No se encontraron cuentas publicitarias en tu perfil de Meta.'
    : errorOAuth === 'token_invalido' ? 'Error al obtener el token de Meta. Intenta de nuevo.'
    : errorOAuth === 'oauth_error' ? 'Error durante la autenticación con Meta. Intenta de nuevo.'
    : ''
  )
  const [exitoManual, setExitoManual] = useState(false)
  const [campañasEncontradas, setCampañasEncontradas] = useState(0)
  const [estado, setEstado] = useState<EstadoConexion | null>(null)
  const [cargandoEstado, setCargandoEstado] = useState(true)
  const [mostrarManual, setMostrarManual] = useState(false)
  const oauthDisponible = process.env.NEXT_PUBLIC_META_OAUTH_ENABLED === 'true'

  useEffect(() => {
    fetch('/api/meta-config')
      .then(r => r.json())
      .then(json => { if (json.exito) setEstado(json.datos) })
      .catch(() => {})
      .finally(() => setCargandoEstado(false))
  }, [exito])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accessToken.trim() || !adAccountId.trim()) return
    setEnviando(true)
    setError('')

    try {
      const res = await fetch('/api/meta-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken.trim(), ad_account_id: adAccountId.trim() }),
      })
      const json = await res.json()
      if (json.exito) {
        setExitoManual(true)
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

  const conectadoExitosamente = exito || exitoManual

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/configuracion" className="p-2 rounded-lg hover:bg-card transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conectar Meta Ads</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Vincula tu cuenta publicitaria de Facebook e Instagram</p>
        </div>
      </div>

      {/* Estado actual */}
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
            <p className="text-xs text-muted-foreground mt-0.5">Cuenta: <span className="font-mono">{estado.adAccountId}</span></p>
            {estado.configuradaDesde && (
              <p className="text-xs text-muted-foreground">
                Conectado el {new Date(estado.configuradaDesde).toLocaleDateString('es-ES')}
              </p>
            )}
            {conectadoExitosamente && (
              <Link href="/dashboard" className="text-xs text-primary hover:underline mt-1 inline-block">
                Ir al Dashboard →
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">No hay ninguna cuenta de Meta Ads conectada.</p>
        </div>
      )}

      {/* Error de OAuth */}
      {error && !conectadoExitosamente && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Opción 1: OAuth (recomendado) */}
      {oauthDisponible && !estado?.configurada && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="#1877F2" className="w-5 h-5">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Conectar con Meta (recomendado)</p>
              <p className="text-xs text-muted-foreground">Inicia sesión con tu cuenta de Facebook directamente</p>
            </div>
          </div>
          <a
            href="/api/auth/meta/iniciar"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#1877F2] text-white rounded-xl text-sm font-medium hover:bg-[#1565C0] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continuar con Facebook
          </a>
        </div>
      )}

      {/* Opción 2: Manual (token) */}
      {!conectadoExitosamente && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setMostrarManual(!mostrarManual)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-background/50 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">
                {oauthDisponible ? 'Conectar manualmente (avanzado)' : 'Conectar con Access Token'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Pega tu token de acceso de Meta Graph API</p>
            </div>
            {mostrarManual ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {mostrarManual && (
            <div className="px-5 pb-5 space-y-5 border-t border-border">
              {/* Instrucciones */}
              <div className="pt-4">
                <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Cómo obtener tu Access Token</p>
                <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                  <li>Ve al <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">Graph API Explorer <ExternalLink className="w-2.5 h-2.5" /></a></li>
                  <li>Selecciona tu app y haz clic en <strong className="text-foreground">Generate Access Token</strong></li>
                  <li>Agrega: <code className="bg-background px-1 rounded">ads_read</code>, <code className="bg-background px-1 rounded">ads_management</code>, <code className="bg-background px-1 rounded">read_insights</code></li>
                  <li>Copia el token y tu Ad Account ID (formato: <code className="bg-background px-1 rounded">act_123456789</code>)</li>
                </ol>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="access-token" className="block text-xs font-medium text-foreground mb-1.5">Access Token de Meta</label>
                  <textarea
                    id="access-token"
                    value={accessToken}
                    onChange={e => setAccessToken(e.target.value)}
                    placeholder="EAAxxxxxxxxxx..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="ad-account-id" className="block text-xs font-medium text-foreground mb-1.5">ID de Cuenta Publicitaria</label>
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

                <button
                  type="submit"
                  disabled={enviando || !accessToken.trim() || !adAccountId.trim()}
                  className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                  {enviando ? 'Validando…' : 'Conectar cuenta'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Éxito tras conexión manual */}
      {exitoManual && (
        <div className="bg-card border border-border rounded-xl p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Conexión exitosa</h3>
          <p className="text-muted-foreground text-sm">
            Se encontraron <strong className="text-foreground">{campañasEncontradas} campañas</strong>. La sincronización comenzará en los próximos 15 minutos.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors mt-2">
            Ir al Dashboard
          </Link>
        </div>
      )}
    </div>
  )
}
