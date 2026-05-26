'use client'

// Página de Analíticas — gráficos interactivos con selector de período
import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts'
import { cn, formatearMoneda, formatearNumero } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Periodo = '7d' | '30d' | '90d'

interface DatoMetricaDiaria {
  fecha: string
  gasto_centavos?: number | null
  roas?: number | null
  ctr?: number | null
  cpc?: number | null
  conversiones?: number | null
  cpa?: number | null
}

interface DatoPunto {
  fecha: string
  gasto: number
  roas: number
  ctr: number
  conversiones: number
  cpa: number
}

interface ResumenKPIs {
  gasto: number
  roas: number
  ctr: number
  conversiones: number
  cpa: number
}

// ─── Tooltip personalizado ────────────────────────────────────────────────────

function TooltipPersonalizado({
  active,
  payload,
  label,
  metricaActiva,
}: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: string
  metricaActiva: string
}) {
  if (!active || !payload?.length) return null

  const entry = payload[0]
  let valorFormateado = ''
  if (metricaActiva === 'gasto' || metricaActiva === 'cpa') {
    valorFormateado = formatearMoneda(entry.value)
  } else if (metricaActiva === 'roas') {
    valorFormateado = `${entry.value.toFixed(1).replace('.', ',')}x`
  } else if (metricaActiva === 'ctr') {
    valorFormateado = `${entry.value.toFixed(1).replace('.', ',')}%`
  } else {
    valorFormateado = formatearNumero(entry.value)
  }

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1 font-medium">{label}</p>
      <p className="text-sm font-semibold text-foreground">{valorFormateado}</p>
    </div>
  )
}

// ─── Tarjeta KPI ─────────────────────────────────────────────────────────────

function TarjetaKPI({
  label,
  valor,
  activa,
  color,
  onClick,
}: {
  label: string
  valor: string
  activa: boolean
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'bg-card border rounded-xl p-4 text-left transition-all w-full',
        activa ? 'border-[--c] shadow-sm' : 'border-border hover:border-border/80'
      )}
      style={{ '--c': color } as React.CSSProperties}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className="text-xl font-bold"
        style={{ color: activa ? color : 'var(--foreground)' }}
      >
        {valor}
      </p>
    </button>
  )
}

// ─── Configuración de métricas ────────────────────────────────────────────────

const METRICAS = [
  { clave: 'gasto', label: 'Gasto', color: '#6366f1', formato: 'moneda' },
  { clave: 'roas', label: 'ROAS', color: '#10b981', formato: 'roas' },
  { clave: 'ctr', label: 'CTR', color: '#f59e0b', formato: 'pct' },
  { clave: 'conversiones', label: 'Conversiones', color: '#8b5cf6', formato: 'numero' },
  { clave: 'cpa', label: 'CPA', color: '#ef4444', formato: 'moneda' },
] as const

const PERIODOS: { valor: Periodo; label: string; dias: number }[] = [
  { valor: '7d', label: 'Últimos 7 días', dias: 7 },
  { valor: '30d', label: 'Últimos 30 días', dias: 30 },
  { valor: '90d', label: 'Últimos 90 días', dias: 90 },
]

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PaginaAnaliticas() {
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const [metricaActiva, setMetricaActiva] = useState<string>('gasto')
  const [datos, setDatos] = useState<DatoPunto[]>([])
  const [kpis, setKpis] = useState<ResumenKPIs | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargarDatos = useCallback(async (p: Periodo) => {
    setCargando(true)
    try {
      const dias = PERIODOS.find((x) => x.valor === p)?.dias ?? 30
      const fechaDesde = new Date(Date.now() - dias * 86_400_000).toISOString().split('T')[0]
      const fechaHasta = new Date().toISOString().split('T')[0]

      // Llamar a API de métricas diarias y KPIs en paralelo
      const [resDaily, resKpis] = await Promise.all([
        fetch(`/api/metricas/diarias?dias=${dias}`),
        fetch(`/api/metricas?desde=${fechaDesde}&hasta=${fechaHasta}`),
      ])

      if (resDaily.ok && resKpis.ok) {
        const dailyJson = await resDaily.json()
        const kpisJson = await resKpis.json()

        if (dailyJson.exito && dailyJson.datos?.length > 0) {
          // Filtrar al período seleccionado y transformar
          const puntos: DatoPunto[] = (dailyJson.datos as DatoMetricaDiaria[])
            .filter((d) => d.fecha >= fechaDesde)
            .map((d) => ({
              fecha: new Date(d.fecha).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
              }),
              gasto: (d.gasto_centavos ?? 0) / 100,
              roas: d.roas ?? 0,
              ctr: d.ctr ?? 0,
              conversiones: d.conversiones ?? 0,
              cpa: d.cpa ?? 0,
            }))
          setDatos(puntos)
        } else {
          setDatos([])
        }

        if (kpisJson.exito) {
          setKpis(kpisJson.datos)
        }
      } else {
        setDatos([])
      }
    } catch {
      setDatos([])
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos(periodo)
  }, [periodo, cargarDatos])

  // Valores de KPI resumen (desde API o calculados desde datos)
  const resumen: ResumenKPIs = kpis ?? {
    gasto: datos.reduce((acc, d) => acc + d.gasto, 0),
    roas: datos.length > 0 ? datos.reduce((acc, d) => acc + d.roas, 0) / datos.length : 0,
    ctr: datos.length > 0 ? datos.reduce((acc, d) => acc + d.ctr, 0) / datos.length : 0,
    conversiones: datos.reduce((acc, d) => acc + d.conversiones, 0),
    cpa: datos.length > 0 ? datos.reduce((acc, d) => acc + d.cpa, 0) / datos.length : 0,
  }

  const metricaConfig = METRICAS.find((m) => m.clave === metricaActiva) ?? METRICAS[0]

  function formatearValorKPI(clave: string, valor: number): string {
    if (clave === 'gasto' || clave === 'cpa') return formatearMoneda(valor)
    if (clave === 'roas') return `${valor.toFixed(1).replace('.', ',')}x`
    if (clave === 'ctr') return `${valor.toFixed(1).replace('.', ',')}%`
    return formatearNumero(valor)
  }

  // Formateador del eje Y según la métrica
  function formatearEjeY(v: number): string {
    if (metricaActiva === 'gasto' || metricaActiva === 'cpa') {
      return v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
    }
    if (metricaActiva === 'roas') return `${v}x`
    if (metricaActiva === 'ctr') return `${v}%`
    return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
  }

  const periodoInfo = PERIODOS.find((p) => p.valor === periodo)!

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Encabezado ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analíticas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Rendimiento detallado de todas tus campañas
          </p>
        </div>

        {/* Selector de período */}
        <div
          className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl"
          role="group"
          aria-label="Seleccionar período de análisis"
        >
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              onClick={() => setPeriodo(p.valor)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                periodo === p.valor
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-pressed={periodo === p.valor}
            >
              {p.valor === '7d' ? '7 días' : p.valor === '30d' ? '30 días' : '90 días'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tarjetas KPI clickables ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {METRICAS.map((m) => (
          <TarjetaKPI
            key={m.clave}
            label={m.label}
            valor={formatearValorKPI(m.clave, resumen[m.clave as keyof ResumenKPIs])}
            activa={metricaActiva === m.clave}
            color={m.color}
            onClick={() => setMetricaActiva(m.clave)}
          />
        ))}
      </div>

      {/* ── Gráfico de área ───────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {metricaConfig.label} · {periodoInfo.label}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cargando ? 'Cargando datos…' : `${datos.length} puntos de datos`}
            </p>
          </div>
        </div>

        {cargando ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : datos.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted/10 flex items-center justify-center">
              <div className="w-6 h-6 rounded border-2 border-dashed border-muted-foreground/30" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sin datos para este período</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                Conecta tu cuenta de Meta Ads para ver analíticas reales
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={datos} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradMetrica" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metricaConfig.color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={metricaConfig.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
              <XAxis
                dataKey="fecha"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={periodo === '7d' ? 0 : periodo === '30d' ? 4 : 13}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatearEjeY}
                width={52}
              />
              <Tooltip
                content={
                  <TooltipPersonalizado metricaActiva={metricaActiva} />
                }
                cursor={{ stroke: '#2d3748', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey={metricaActiva}
                stroke={metricaConfig.color}
                strokeWidth={2}
                fill="url(#gradMetrica)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: metricaConfig.color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Gráfico multi-línea comparativo ──────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-foreground">
            Gasto vs ROAS · {periodoInfo.label}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Correlación entre inversión y retorno
          </p>
        </div>

        {cargando ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={datos} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
              <XAxis
                dataKey="fecha"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={periodo === '7d' ? 0 : periodo === '30d' ? 4 : 13}
              />
              <YAxis
                yAxisId="izq"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                }
                width={48}
              />
              <YAxis
                yAxisId="der"
                orientation="right"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}x`}
                domain={[0, 'auto']}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
              />
              <Line
                yAxisId="izq"
                type="monotone"
                dataKey="gasto"
                name="Gasto"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line
                yAxisId="der"
                type="monotone"
                dataKey="roas"
                name="ROAS"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Leyenda */}
        <div className="flex items-center gap-6 mt-4 justify-center">
          {[
            { color: '#6366f1', label: 'Gasto (eje izq.)' },
            { color: '#10b981', label: 'ROAS (eje der.)' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Resumen del período ───────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Resumen del período
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {METRICAS.map((m) => (
            <div key={m.clave} className="text-center">
              <div
                className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                style={{ backgroundColor: `${m.color}20` }}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">{m.label}</p>
              <p className="text-base font-bold text-foreground">
                {formatearValorKPI(m.clave, resumen[m.clave as keyof ResumenKPIs])}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
