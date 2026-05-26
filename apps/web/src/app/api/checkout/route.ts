import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { autenticarRequest, noAutorizado } from '@/lib/api/autenticar'

let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY no configurado')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
  }
  return _stripe
}

const PRICE_IDS: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
}

// POST /api/checkout — crea una sesión de Stripe Checkout y devuelve la URL
export async function POST(req: NextRequest) {
  const usuario = await autenticarRequest(req)
  if (!usuario) return noAutorizado()

  try {
    const { plan } = await req.json()
    const priceId = PRICE_IDS[plan]

    if (!priceId) {
      return NextResponse.json(
        { exito: false, error: `Plan inválido o sin precio configurado: ${plan}` },
        { status: 400 }
      )
    }

    const origen = req.headers.get('origin') ?? 'https://divinads.com'

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: usuario.email,
      metadata: { tenant_id: usuario.tenantId, plan },
      success_url: `${origen}/dashboard?checkout=success`,
      cancel_url: `${origen}/precios?checkout=cancelled`,
    })

    return NextResponse.json({ exito: true, url: session.url })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error interno del servidor'
    console.error('[api/checkout] Error al crear sesión de Stripe', error)
    return NextResponse.json({ exito: false, error: mensaje }, { status: 500 })
  }
}
