import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/api/autenticar'

let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY no configurado')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
  }
  return _stripe
}

// Deshabilitar el body parser de Next.js — Stripe necesita el raw body para verificar la firma
export const config = { api: { bodyParser: false } }

// POST /api/webhooks/stripe — recibe eventos de Stripe y actualiza el estado de suscripción
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[webhooks/stripe] STRIPE_WEBHOOK_SECRET no configurado')
    return NextResponse.json({ error: 'Webhook no configurado' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Firma de Stripe requerida' }, { status: 400 })
  }

  let evento: Stripe.Event
  try {
    const rawBody = await req.text()
    evento = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    console.warn('[webhooks/stripe] Firma inválida o payload corrupto', error)
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  try {
    switch (evento.type) {
      case 'checkout.session.completed': {
        const session = evento.data.object as Stripe.Checkout.Session
        const tenantId = session.metadata?.tenant_id
        const plan = session.metadata?.plan ?? 'pro'
        if (!tenantId) break

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('tenants')
          .update({
            plan,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            suscripcion_activa: true,
          })
          .eq('id', tenantId)

        console.info(`[webhooks/stripe] Suscripción activada: tenant=${tenantId} plan=${plan}`)
        break
      }

      case 'customer.subscription.updated': {
        const sub = evento.data.object as Stripe.Subscription
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tenant } = await (supabase as any)
          .from('tenants')
          .select('id')
          .eq('stripe_subscription_id', sub.id)
          .single()

        if (tenant) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('tenants')
            .update({ suscripcion_activa: sub.status === 'active' })
            .eq('id', tenant.id)
          console.info(`[webhooks/stripe] Suscripción actualizada: tenant=${tenant.id} estado=${sub.status}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = evento.data.object as Stripe.Subscription
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tenant } = await (supabase as any)
          .from('tenants')
          .select('id')
          .eq('stripe_subscription_id', sub.id)
          .single()

        if (tenant) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('tenants')
            .update({ plan: 'gratuito', suscripcion_activa: false })
            .eq('id', tenant.id)
          console.info(`[webhooks/stripe] Suscripción cancelada: tenant=${tenant.id}`)
        }
        break
      }

      default:
        console.debug(`[webhooks/stripe] Evento ignorado: ${evento.type}`)
    }

    return NextResponse.json({ recibido: true })
  } catch (error) {
    console.error(`[webhooks/stripe] Error procesando evento ${evento.type}`, error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
