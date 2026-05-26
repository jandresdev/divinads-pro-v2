'use client'

// Página de campañas — búsqueda, filtros, tabla completa y formulario de conexión
import { useState, useMemo } from 'react'
import { Search, Plus, X, Megaphone } from 'lucide-react'
import { cn, formatearMoneda, formatearNumero } from '@/lib/utils'
import TablaCampañas, { type DatoCampaña } from '@/components/dashboard/TablaCampañas'
import SinConexionMeta from '@/components/SinConexionMeta'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type FiltroEstado = 'todas' | 'activa' | 'pausada'

interface PropsModal {
  onCerrar: () => void
}

// ─── Modal conectar campaña ───────────────────────────────────────────────────

function ModalConectarCampaña({ onCerrar }: PropsModal) {
  const [metaCampaignId, setMetaCampaignId] = useState('')
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('Prospección')
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !metaCampaignId.trim()) return
    setEnviando(true)
    setError('')

    try {
      const res = await fetch('/api/campanias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          meta_campaign_id: metaCampaignId.trim(),
          tipo_campaña: tipo,
        }),
      })
      const json = await res.json()
      if (json.exito) {
        setExito(true)
        setTimeout(onCerrar, 1500)
      } else {
        setError(json.error ?? 'Error al conectar la campaña')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label="Conectar campaña de Meta Ads"
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Conectar campaña</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Vincula una campaña de Meta Ads</p>
          </div>
          <button
            onClick={onCerrar}
            className="p-2 rounded-lg hover:bg-background transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {exito ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-success text-xl">✓</span>
            </div>
            <p className="text-foreground font-medium">Campaña conectada</p>
            <p className="text-muted-foreground text-sm mt-1">Los datos se sincronizarán en los próximos 15 min</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Nombre de la campaña
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Prospección - Lookalike 2%"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                ID de campaña Meta Ads
              </label>
              <input
                type="text"
                value={metaCampaignId}
                onChange={(e) => setMetaCampaignId(e.target.value)}
                placeholder="Ej: 23849123456"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Encuéntralo en Meta Ads Manager → Campañas → ID
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Tipo de campaña
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                {['Prospección', 'Remarketing', 'Retargeting', 'Conversión'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCerrar}
                className="flex-1 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando || !nombre.trim() || !metaCampaignId.trim()}
                className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviando ? 'Conectando…' : 'Conectar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface PropsPaginaCampanias {
  campañas: DatoCampaña[]
}

export default function PaginaCampaniasCliente({ campañas }: PropsPaginaCampanias) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todas')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [modalAbierto, setModalAbierto] = useState(false)

  // Tipos únicos presentes en las campañas para el filtro
  const tiposDisponibles = useMemo(
    () => ['todos', ...Array.from(new Set(campañas.map((c) => c.tipo)))],
    [campañas]
  )

  // Campañas filtradas según búsqueda, estado y tipo
  const campañasFiltradas = useMemo(() => {
    return campañas.filter((c) => {
      const coincideBusqueda = c.nombre.toLowerCase().includes(busqueda.toLowerCase())
      const coincideEstado = filtroEstado === 'todas' || c.estado === filtroEstado
      const coincideTipo = filtroTipo === 'todos' || c.tipo === filtroTipo
      return coincideBusqueda && coincideEstado && coincideTipo
    })
  }, [campañas, busqueda, filtroEstado, filtroTipo])

  // Métricas agregadas para las tarjetas de resumen
  const resumen = useMemo(() => {
    const activas = campañas.filter((c) => c.estado === 'activa')
    const gastoTotal = activas.reduce((acc, c) => acc + c.gasto, 0)
    const roasPromedio = activas.length > 0
      ? activas.reduce((acc, c) => acc + c.roas, 0) / activas.length
      : 0
    const conversionesTotal = activas.reduce((acc, c) => acc + c.conversiones, 0)
    return { activas: activas.length, gastoTotal, roasPromedio, conversionesTotal }
  }, [campañas])

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* ── Encabezado ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Campañas</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gestiona y monitorea todas tus campañas de Meta Ads
            </p>
          </div>
          <button
            onClick={() => setModalAbierto(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Conectar campaña
          </button>
        </div>

        {/* ── Tarjetas de resumen ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Campañas activas', valor: resumen.activas.toString(), icono: '🟢' },
            { label: 'Gasto total (30d)', valor: formatearMoneda(resumen.gastoTotal), icono: '💰' },
            { label: 'ROAS promedio', valor: `${resumen.roasPromedio.toFixed(1).replace('.', ',')}x`, icono: '📈' },
            { label: 'Conversiones', valor: formatearNumero(resumen.conversionesTotal), icono: '🎯' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <span aria-hidden="true">{stat.icono}</span>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {stat.label}
                </p>
              </div>
              <p className="text-xl font-bold text-foreground">{stat.valor}</p>
            </div>
          ))}
        </div>

        {/* ── Búsqueda y filtros ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Campo de búsqueda */}
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar campaña por nombre…"
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          {/* Filtro de estado */}
          <div
            className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl"
            role="group"
            aria-label="Filtrar por estado"
          >
            {(['todas', 'activa', 'pausada'] as FiltroEstado[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltroEstado(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize',
                  filtroEstado === f
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f === 'todas' ? 'Todas' : f === 'activa' ? 'Activas' : 'Pausadas'}
              </button>
            ))}
          </div>

          {/* Filtro de tipo */}
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary/50"
            aria-label="Filtrar por tipo"
          >
            {tiposDisponibles.map((t) => (
              <option key={t} value={t}>
                {t === 'todos' ? 'Todos los tipos' : t}
              </option>
            ))}
          </select>
        </div>

        {/* ── Tabla de campañas ──────────────────────────────────────────── */}
        {campañas.length === 0 ? (
          <SinConexionMeta mensaje="Conecta tu cuenta de Meta Ads para sincronizar y monitorear tus campañas en tiempo real." />
        ) : campañasFiltradas.length > 0 ? (
          <div>
            <p className="text-xs text-muted-foreground mb-3">
              Mostrando {campañasFiltradas.length} de {campañas.length} campañas · Métricas últimos 30 días
            </p>
            <TablaCampañas campañas={campañasFiltradas} />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-16 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/10 flex items-center justify-center">
              <Megaphone className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Sin resultados</h2>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                {busqueda
                  ? `No se encontraron campañas con "${busqueda}"`
                  : 'No hay campañas con los filtros seleccionados'}
              </p>
            </div>
            <button
              onClick={() => { setBusqueda(''); setFiltroEstado('todas'); setFiltroTipo('todos') }}
              className="text-sm text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Modal para conectar nueva campaña */}
      {modalAbierto && (
        <ModalConectarCampaña onCerrar={() => setModalAbierto(false)} />
      )}
    </>
  )
}
