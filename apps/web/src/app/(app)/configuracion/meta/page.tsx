'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, ExternalLink, ChevronDown, ChevronUp, RefreshCw, Zap } from 'lucide-react'
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
  // Detalles de diagnóstico del error de OAuth (vienen como query params)
  const metaErrorCode = searchParams.get('meta_code')
  const metaErrorMsg = searchParams.get('meta_msg')
  const redirectUriUsado = searchParams.get('redirect_uri')

  const [error, setError] = useState(() => {
    if (errorOAuth === 'oauth_cancelado') return 'Conectar con Meta fue cancelado.'
    if (errorOAuth === 'sesion_expirada') return 'La sesión expiró. Intenta de nuevo desde el botón de conexión.'
    if (errorOAuth === 'sin_cuentas') return 'No se encontraron cuentas publicitarias en tu perfil de Meta.'
    if (errorOAuth === 'config_faltante') return 'META_APP_ID o META_APP_SECRET no están configurados en las variables de entorno del servidor.'
    if (errorOAuth === 'token_invalido') {
      if (metaErrorCode === '191') return `Meta rechazó el intercambio: la redirect_uri no está registrada en tu app de Meta. URI usada: ${redirectUriUsado ?? '(desconocida)'}`
      if (metaErrorCode === '1') return 'Meta rechazó el intercambio: client_secret inválido. Verifica META_APP_SECRET en las variables de entorno de Vercel.'
      if (metaErrorMsg) return `Meta rechazó el intercambio (código ${metaErrorCode}): ${metaErrorMsg}`
      return 'Error al obtener el token de Meta. Revisa los logs del servidor para más detalles.'
    }
    if (errorOAuth === 'oauth_error') return 'Error inesperado durante la autenticación con Meta. Intenta de nuevo.'
    return ''
  })
  const [exitoManual, setExitoManual] = useState(false)
  const [campañasEncontradas, setCampañasEncontradas] = useState(0)
  const [estado, setEstado] = useState<EstadoConexion | null>(null)
  const [cargandoEstado, setCargandoEstado] = useState(true)
  const [mostrarManual, setMostrarManual] = useState(false)
  // Controla si el usuario quiere reconectar (actualizar token/cuenta)
  const [modoReconectar, setModoReconectar] = useState(false)
  // Estado de sincronización manual
  const [sincronizando, setSincronizando] = useState(false)
  const [resultadoSync, setResultadoSync] = useState<{ exitoso: boolean; mensaje: string } | null>(null)
  // Diagnóstico de OAuth
  const [diagnostico, setDiagnostico] = useState<Record<string, string | boolean> | null>(null)
  const [cargandoDiag, setCargandoDiag] = useState(false)
  const oauthDisponible = process.env.NEXT_PUBLIC_META_OAUTH_ENABLED === 'true'

  useEffect(() => {
    fetch('/api/meta-config')
      .then(r => r.json())
      .then(json => { if (json.exito) setEstado(json.datos) })
      .catch(() => {})
      .finally(() => setCargandoEstado(false))
  }, [exito])

  // Activar modo reconectar si hay un error de OAuth (el token anterior falló)
  useEffect(() => {
    if (errorOAuth) setModoReconectar(true)
  }, [errorOAuth])

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
        setModoReconectar(false)
      } else {
        setError(json.error ?? 'Error al conectar con Meta. Verifica tu token.')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  // Cargar diagnóstico de configuración OAuth
  async function cargarDiagnostico() {
    setCargandoDiag(true)
    try {
      const res = await fetch('/api/auth/meta/diagnostico')
      const json = await res.json()
      if (json.exito) setDiagnostico(json.diagnostico)
    } catch {
      setDiagnostico({ error: 'No se pudo cargar el diagnóstico' })
    } finally {
      setCargandoDiag(false)
    }
  }

  // Disparar sincronización inmediata con Meta API
  async function sincronizarAhora() {
    setSincronizando(true)
    setResultadoSync(null)
    try {
      const res = await fetch('/api/sincronizacion', { method: 'POST' })
      const json = await res.json()
      if (json.exito) {
        const { campañasSincronizadas = 0, metricasSincronizadas = 0 } = json.datos ?? {}
        setResultadoSync({
          exitoso: true,
          mensaje: `Sincronización completada: ${campañasSincronizadas} campañas y ${metricasSincronizadas} métricas actualizadas.`,
        })
      } else {
        setResultadoSync({
          exitoso: false,
          mensaje: json.error ?? 'Error al sincronizar con Meta. Verifica que el token sea válido.',
        })
      }
    } catch {
      setResultadoSync({ exitoso: false, mensaje: 'Error de conexión al sincronizar. Intenta de nuevo.' })
    } finally {
      setSincronizando(false)
    }
  }

  const conectadoExitosamente = exito || exitoManual
  // Mostrar opciones de conexión si: no está configurado, o el usuario quiere reconectar
  const mostrarOpciones = !estado?.configurada || modoReconectar

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
        <div className="bg-success/5 border border-success/20 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Meta Ads conectado</p>
                <p className="text-xs text-muted-foreground mt-0.5">Cuenta: <span className="font-mono">{estado.adAccountId}</span></p>
                {estado.configuradaDesde && (
                  <p className="text-xs text-muted-foreground">
                    Conectado el {new Date(estado.configuradaDesde).toLocaleDateString('es-ES')}
                  </p>
                )}
                <Link href="/dashboard" className="text-xs text-primary hover:underline mt-1 inline-block">
                  Ir al Dashboard →
                </Link>
              </div>
            </div>
            {/* Botón de reconectar — permite al usuario actualizar token o cambiar cuenta */}
            {!modoReconectar && (
              <button
                onClick={() => { setModoReconectar(true); setError('') }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 px-3 py-1.5 rounded-lg border border-border hover:bg-card"
              >
                <RefreshCw className="w-3 h-3" />
                Reconectar
              </button>
            )}
          </div>

          {/* Botón de sincronización inmediata */}
          {!modoReconectar && (
            <div className="border-t border-success/10 pt-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  La sincronización se ejecuta automáticamente cada 15 minutos.
                </p>
                <button
                  onClick={sincronizarAhora}
                  disabled={sincronizando}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50 shrink-0"
                >
                  {sincronizando
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Zap className="w-3 h-3" />
                  }
                  {sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
                </button>
              </div>

              {/* Resultado de sincronización */}
              {resultadoSync && (
                <div className={`mt-2 p-2 rounded-lg text-xs ${resultadoSync.exitoso ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {resultadoSync.mensaje}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">No hay ninguna cuenta de Meta Ads conectada.</p>
        </div>
      )}

      {/* Error de OAuth con diagnóstico detallado */}
      {error && !conectadoExitosamente && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>

          {/* Guía de solución para error de redirect_uri */}
          {errorOAuth === 'token_invalido' && (
            <div className="p-3 bg-card border border-border rounded-lg text-xs text-muted-foreground space-y-3">
              <p className="font-semibold text-foreground">¿Cómo resolver este error?</p>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Ve a <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">developers.facebook.com/apps</a> → selecciona tu app</li>
                <li>Menú lateral: <strong className="text-foreground">Facebook Login → Configuración</strong></li>
                <li>En <strong className="text-foreground">"URI de redireccionamiento de OAuth válidos"</strong>, agrega exactamente:
                  {redirectUriUsado && (
                    <code className="mt-1 block bg-background px-2 py-1.5 rounded font-mono break-all text-foreground">
                      {redirectUriUsado}
                    </code>
                  )}
                </li>
                <li>En Vercel → Settings → Env Vars, verifica: <code className="bg-background px-1 rounded">META_APP_ID</code>, <code className="bg-background px-1 rounded">META_APP_SECRET</code>, <code className="bg-background px-1 rounded">NEXT_PUBLIC_APP_URL</code></li>
              </ol>

              {/* Botón para ver diagnóstico en vivo */}
              <div>
                <button
                  onClick={cargarDiagnostico}
                  disabled={cargandoDiag}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  {cargandoDiag ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {cargandoDiag ? 'Cargando…' : 'Ver configuración actual del servidor'}
                </button>
                {diagnostico && (
                  <div className="mt-2 p-2 bg-background rounded-lg font-mono text-xs space-y-1 border border-border">
                    <p><span className={diagnostico.META_APP_ID_configurado ? 'text-success' : 'text-destructive'}>● META_APP_ID: {diagnostico.META_APP_ID_configurado ? '✓ configurado' : '✗ NO configurado'}</span></p>
                    <p><span className={diagnostico.META_APP_SECRET_configurado ? 'text-success' : 'text-destructive'}>● META_APP_SECRET: {diagnostico.META_APP_SECRET_configurado ? '✓ configurado' : '✗ NO configurado'}</span></p>
                    <p>● NEXT_PUBLIC_APP_URL: <span className="text-foreground">{String(diagnostico.NEXT_PUBLIC_APP_URL)}</span></p>
                    <p className="pt-1 text-foreground font-semibold">URI que debes registrar en Meta:</p>
                    <p className="break-all text-primary">{String(diagnostico.callbackUrl)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {errorOAuth === 'config_faltante' && (
            <div className="p-3 bg-card border border-border rounded-lg text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Variables de entorno faltantes en Vercel:</p>
              <p>Ve a Vercel → Tu proyecto → Settings → Environment Variables y agrega:</p>
              <code className="block bg-background px-2 py-1 rounded font-mono mt-1">META_APP_ID=tu-app-id</code>
              <code className="block bg-background px-2 py-1 rounded font-mono">META_APP_SECRET=tu-app-secret</code>
              <code className="block bg-background px-2 py-1 rounded font-mono">NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app</code>
            </div>
          )}
        </div>
      )}

      {/* Sección de reconexión — visible cuando modoReconectar activo pero ya estaba configurado */}
      {modoReconectar && estado?.configurada && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <RefreshCw className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm text-foreground">
            Estás actualizando la conexión con Meta Ads. El token anterior será reemplazado.
          </p>
        </div>
      )}

      {/* Opciones de conexión — visibles cuando no configurado O en modo reconectar */}
      {mostrarOpciones && (
        <>
          {/* Opción 1: OAuth (recomendado) */}
          {oauthDisponible && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="#1877F2" className="w-5 h-5">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {estado?.configurada ? 'Reconectar con Meta (recomendado)' : 'Conectar con Meta (recomendado)'}
                  </p>
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
                {estado?.configurada ? 'Reconectar con Facebook' : 'Continuar con Facebook'}
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
                    {oauthDisponible
                      ? (estado?.configurada ? 'Actualizar manualmente (avanzado)' : 'Conectar manualmente (avanzado)')
                      : (estado?.configurada ? 'Actualizar con Access Token' : 'Conectar con Access Token')
                    }
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

                    <div className="flex gap-3">
                      {modoReconectar && (
                        <button
                          type="button"
                          onClick={() => { setModoReconectar(false); setError(''); setMostrarManual(false) }}
                          className="flex-1 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={enviando || !accessToken.trim() || !adAccountId.trim()}
                        className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                        {enviando ? 'Validando…' : (estado?.configurada ? 'Actualizar conexión' : 'Conectar cuenta')}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Cancelar reconexión */}
          {modoReconectar && estado?.configurada && !mostrarManual && (
            <button
              onClick={() => { setModoReconectar(false); setError('') }}
              className="w-full py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar — mantener conexión actual
            </button>
          )}
        </>
      )}

      {/* Éxito tras conexión manual */}
      {exitoManual && (
        <div className="bg-card border border-border rounded-xl p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Conexión exitosa</h3>
          <p className="text-muted-foreground text-sm">
            Se encontraron <strong className="text-foreground">{campañasEncontradas} campañas</strong>. Sincroniza ahora para ver los datos en el dashboard.
          </p>
          {resultadoSync && (
            <div className={`p-2 rounded-lg text-xs ${resultadoSync.exitoso ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
              {resultadoSync.mensaje}
            </div>
          )}
          <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
            <button
              onClick={sincronizarAhora}
              disabled={sincronizando}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {sincronizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
            </button>
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              Ir al Dashboard →
            </Link>
          </div>
        </div>
      )}

      {/* Éxito tras OAuth */}
      {exito && !exitoManual && (
        <div className="bg-card border border-border rounded-xl p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">¡Conectado con Meta!</h3>
          <p className="text-muted-foreground text-sm">
            Tu cuenta fue conectada exitosamente. Sincroniza ahora para ver los datos de inmediato.
          </p>
          {resultadoSync && (
            <div className={`p-2 rounded-lg text-xs ${resultadoSync.exitoso ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
              {resultadoSync.mensaje}
            </div>
          )}
          <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
            <button
              onClick={sincronizarAhora}
              disabled={sincronizando}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {sincronizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
            </button>
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              Ir al Dashboard →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
