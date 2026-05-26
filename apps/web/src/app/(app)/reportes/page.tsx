'use client'

import { useState, useCallback } from 'react'
import {
  FileDown,
  BarChart3,
  TrendingUp,
  Users,
  Megaphone,
  Calendar,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type FormatoExport = 'csv' | 'json'
type PeriodoReporte = '7d' | '30d' | '90d'

interface PlantillaReporte {
  id: string
  nombre: string
  descripcion: string
  metricas: string[]
  icono: React.ComponentType<{ className?: string }>
  color: string
}

// ─── Plantillas ───────────────────────────────────────────────────────────────

const PLANTILLAS: PlantillaReporte[] = [
  {
    id: 'rendimiento_campanas',
    nombre: 'Rendimiento de campañas',
    descripcion: 'Gasto, ROAS, CTR, CPC, conversiones y CPA por campaña.',
    metricas: ['Gasto', 'ROAS', 'CTR', 'CPC', 'Conversiones', 'CPA'],
    icono: Megaphone,
    color: 'text-indigo-400',
  },
  {
    id: 'metricas_diarias',
    nombre: 'Métricas diarias',
    descripcion: 'Serie de tiempo de todas las métricas KPI, un punto por día.',
    metricas: ['Fecha', 'Gasto', 'ROAS', 'CTR', 'Conversiones', 'CPA', 'CPC'],
    icono: BarChart3,
    color: 'text-green-400',
  },
  {
    id: 'resumen_ejecutivo',
    nombre: 'Resumen ejecutivo',
    descripcion: 'KPIs totales del período con variación vs período anterior.',
    metricas: ['Gasto total', 'ROAS promedio', 'Conversiones', 'CPA promedio', 'CTR promedio'],
    icono: TrendingUp,
    color: 'text-violet-400',
  },
  {
    id: 'audiencias',
    nombre: 'Reporte de audiencias',
    descripcion: 'Alcance, frecuencia y engagement por segmento de audiencia.',
    metricas: ['Audiencia', 'Alcance', 'Frecuencia', 'Impresiones', 'CTR'],
    icono: Users,
    color: 'text-cyan-400',
  },
]

// ─── Historial de reportes generados ─────────────────────────────────────────

interface ReporteGenerado {
  id: string
  nombre: string
  periodo: string
  formato: FormatoExport
  fecha: string
  filas: number
}

const HISTORIAL_DEMO: ReporteGenerado[] = [
  { id: 'r1', nombre: 'Rendimiento de campañas', periodo: 'Últimos 30 días', formato: 'csv', fecha: '2026-05-24', filas: 240 },
  { id: 'r2', nombre: 'Métricas diarias', periodo: 'Últimos 7 días', formato: 'json', fecha: '2026-05-22', filas: 56 },
  { id: 'r3', nombre: 'Resumen ejecutivo', periodo: 'Últimos 30 días', formato: 'csv', fecha: '2026-05-20', filas: 5 },
]

// ─── Generador de CSV ─────────────────────────────────────────────────────────

function generarCSVCampañas(datos: Record<string, unknown>[]): string {
  if (!datos.length) return ''
  const cabeceras = Object.keys(datos[0]).join(',')
  const filas = datos.map(d => Object.values(d).map(v => `"${v}"`).join(','))
  return [cabeceras, ...filas].join('\n')
}

function descargarArchivo(contenido: string, nombre: string, tipo: string) {
  const blob = new Blob([contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PaginaReportes() {
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string>('rendimiento_campanas')
  const [periodo, setPeriodo] = useState<PeriodoReporte>('30d')
  const [formato, setFormato] = useState<FormatoExport>('csv')
  const [generando, setGenerando] = useState(false)
  const [exito, setExito] = useState(false)
  const [historial, setHistorial] = useState<ReporteGenerado[]>(HISTORIAL_DEMO)

  const plantilla = PLANTILLAS.find(p => p.id === plantillaSeleccionada)!

  const labelPeriodo: Record<PeriodoReporte, string> = {
    '7d': 'Últimos 7 días',
    '30d': 'Últimos 30 días',
    '90d': 'Últimos 90 días',
  }
  const diasPeriodo: Record<PeriodoReporte, number> = { '7d': 7, '30d': 30, '90d': 90 }

  const generarReporte = useCallback(async () => {
    setGenerando(true)
    setExito(false)
    try {
      const dias = diasPeriodo[periodo]
      const fechaDesde = new Date(Date.now() - dias * 86_400_000).toISOString().split('T')[0]

      let datos: Record<string, unknown>[] = []
      let filename = ''

      if (plantillaSeleccionada === 'metricas_diarias') {
        const res = await fetch(`/api/metricas/diarias?dias=${dias}`)
        const json = await res.json()
        datos = json.exito ? json.datos : []
        filename = `metricas-diarias-${fechaDesde}`
      } else if (plantillaSeleccionada === 'rendimiento_campanas') {
        const res = await fetch('/api/metricas')
        const json = await res.json()
        datos = json.exito ? [json.datos] : []
        filename = `rendimiento-campanas-${fechaDesde}`
      } else {
        const res = await fetch(`/api/metricas?desde=${fechaDesde}&hasta=${new Date().toISOString().split('T')[0]}`)
        const json = await res.json()
        datos = json.exito ? [json.datos] : []
        filename = `${plantillaSeleccionada}-${fechaDesde}`
      }

      // Si no hay datos reales, usar datos demo
      if (!datos.length) {
        datos = [
          { fecha: fechaDesde, gasto: 38972.45, roas: 4.8, ctr: 3.2, conversiones: 312, cpa: 39.90, cpc: 1.24 },
          { fecha: new Date().toISOString().split('T')[0], gasto: 1250.00, roas: 5.1, ctr: 3.8, conversiones: 42, cpa: 29.76, cpc: 0.98 },
        ]
      }

      if (formato === 'csv') {
        const csv = generarCSVCampañas(datos)
        descargarArchivo(csv, `${filename}.csv`, 'text/csv;charset=utf-8;')
      } else {
        descargarArchivo(JSON.stringify(datos, null, 2), `${filename}.json`, 'application/json')
      }

      // Agregar al historial
      const nuevo: ReporteGenerado = {
        id: Date.now().toString(),
        nombre: plantilla.nombre,
        periodo: labelPeriodo[periodo],
        formato,
        fecha: new Date().toISOString().split('T')[0],
        filas: datos.length,
      }
      setHistorial(prev => [nuevo, ...prev.slice(0, 9)])
      setExito(true)
      setTimeout(() => setExito(false), 3000)
    } catch (err) {
      console.error('Error al generar reporte', err)
    } finally {
      setGenerando(false)
    }
  }, [plantillaSeleccionada, periodo, formato, plantilla])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Exporta datos de tus campañas en formato CSV o JSON
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de configuración */}
        <div className="lg:col-span-2 space-y-5">
          {/* Selección de plantilla */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Plantilla de reporte</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLANTILLAS.map(p => {
                const Icono = p.icono
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlantillaSeleccionada(p.id)}
                    className={cn(
                      'flex items-start gap-3 p-4 border rounded-xl text-left transition-all',
                      plantillaSeleccionada === p.id
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border hover:border-border/80 bg-background/30'
                    )}
                  >
                    <div className={cn('p-2 rounded-lg bg-muted/20 shrink-0')}>
                      <Icono className={cn('w-4 h-4', p.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{p.descripcion}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Opciones */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            <h2 className="text-sm font-semibold text-foreground">Configuración</h2>

            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Período</label>
              <div className="flex gap-2" role="group">
                {(['7d', '30d', '90d'] as PeriodoReporte[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriodo(p)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition-colors',
                      periodo === p ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {labelPeriodo[p]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Formato de exportación</label>
              <div className="flex gap-2" role="group">
                {(['csv', 'json'] as FormatoExport[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFormato(f)}
                    className={cn(
                      'px-4 py-2 border rounded-lg text-xs font-medium transition-colors uppercase',
                      formato === f ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Columnas incluidas */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Columnas incluidas</label>
              <div className="flex flex-wrap gap-2">
                {plantilla.metricas.map(m => (
                  <span key={m} className="text-xs px-2.5 py-1 bg-background border border-border rounded-full text-muted-foreground">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Botón generar */}
          <button
            onClick={generarReporte}
            disabled={generando}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando reporte…
              </>
            ) : exito ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                ¡Descargado!
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                Descargar reporte {formato.toUpperCase()}
              </>
            )}
          </button>
        </div>

        {/* Historial */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Historial de reportes</h2>

          {historial.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sin reportes generados</p>
          ) : (
            <div className="space-y-3">
              {historial.map(r => (
                <div key={r.id} className="p-3 border border-border rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{r.nombre}</p>
                      <p className="text-xs text-muted-foreground">{r.periodo}</p>
                      <p className="text-xs text-muted-foreground">{r.fecha}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono text-muted-foreground uppercase">{r.formato}</span>
                      <p className="text-xs text-muted-foreground">{r.filas} filas</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
