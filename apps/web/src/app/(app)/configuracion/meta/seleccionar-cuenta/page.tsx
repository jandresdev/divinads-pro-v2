'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Loader2, Building2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface CuentaMeta {
  id: string
  nombre: string
  moneda: string
}

export default function PaginaSeleccionarCuenta() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [seleccionando, setSeleccionando] = useState(false)
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<string | null>(null)
  const [error, setError] = useState('')

  const cuentasParam = searchParams.get('cuentas')
  const cuentas: CuentaMeta[] = (() => {
    try {
      return cuentasParam ? JSON.parse(Buffer.from(cuentasParam, 'base64').toString()) : []
    } catch {
      return []
    }
  })()

  async function seleccionar(accountId: string) {
    setCuentaSeleccionada(accountId)
    setSeleccionando(true)
    setError('')

    try {
      const res = await fetch('/api/auth/meta/confirmar-cuenta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      const json = await res.json()

      if (json.exito) {
        router.push('/configuracion/meta?exito=1')
      } else {
        setError(json.error ?? 'Error al conectar la cuenta. Intenta de nuevo.')
        setSeleccionando(false)
        setCuentaSeleccionada(null)
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setSeleccionando(false)
      setCuentaSeleccionada(null)
    }
  }

  if (cuentas.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="text-muted-foreground">No se encontraron cuentas publicitarias.</p>
        <Link href="/configuracion/meta" className="text-primary hover:underline text-sm mt-4 inline-block">
          Volver a configuración
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link
          href="/configuracion/meta"
          className="p-2 rounded-lg hover:bg-card transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Selecciona una cuenta</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Se encontraron {cuentas.length} cuentas publicitarias en tu perfil de Meta
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {cuentas.map(cuenta => (
          <button
            key={cuenta.id}
            onClick={() => seleccionar(cuenta.id)}
            disabled={seleccionando}
            className={cn(
              'w-full flex items-center gap-4 p-4 bg-card border rounded-xl text-left transition-all',
              'hover:border-primary/50 hover:bg-primary/5',
              cuentaSeleccionada === cuenta.id && 'border-primary/50 bg-primary/5',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            <div className="p-2 rounded-lg bg-[#1877F2]/10 shrink-0">
              <Building2 className="w-5 h-5 text-[#1877F2]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{cuenta.nombre}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{cuenta.id} · {cuenta.moneda}</p>
            </div>
            {cuentaSeleccionada === cuenta.id && seleccionando ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-muted-foreground/30 shrink-0" />
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}
