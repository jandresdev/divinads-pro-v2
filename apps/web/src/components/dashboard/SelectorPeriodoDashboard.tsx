'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const PERIODOS = [
  { valor: '1', label: 'Hoy' },
  { valor: '7', label: 'Últimos 7 días' },
  { valor: '30', label: 'Últimos 30 días' },
  { valor: 'mes', label: 'Este mes' },
]

export default function SelectorPeriodoDashboard({ periodoActual }: { periodoActual: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function seleccionar(valor: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('periodo', valor)
    router.push(`/dashboard?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PERIODOS.map((p) => (
        <button
          key={p.valor}
          onClick={() => seleccionar(p.valor)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm border transition-colors',
            periodoActual === p.valor
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
          )}
          aria-pressed={periodoActual === p.valor}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
