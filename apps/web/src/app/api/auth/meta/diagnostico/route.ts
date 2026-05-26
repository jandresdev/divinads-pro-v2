import { NextRequest, NextResponse } from 'next/server'
import { autenticarRequest, noAutorizado } from '@/lib/api/autenticar'

// Deriva la URL base (igual lógica que en iniciar y callback)
function obtenerAppUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
  return `${proto}://${host}`
}

// GET /api/auth/meta/diagnostico — verifica la config de OAuth para diagnóstico
// NO devuelve secretos, solo indica si están configurados
export async function GET(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  const appUrl = obtenerAppUrl(req)
  const callbackUrl = `${appUrl}/api/auth/meta/callback`

  return NextResponse.json({
    exito: true,
    diagnostico: {
      appUrl,
      callbackUrl,
      META_APP_ID_configurado: !!process.env.META_APP_ID,
      META_APP_SECRET_configurado: !!process.env.META_APP_SECRET,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? '(no configurado — se deriva de headers)',
      NEXT_PUBLIC_META_OAUTH_ENABLED: process.env.NEXT_PUBLIC_META_OAUTH_ENABLED ?? '(no configurado)',
      NODE_ENV: process.env.NODE_ENV,
      instrucciones: [
        `Registra esta URI exacta en Meta App → Facebook Login → Configuración → URI de redireccionamiento válidos:`,
        callbackUrl,
      ],
    },
  })
}
