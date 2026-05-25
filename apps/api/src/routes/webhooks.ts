import { Router } from 'express'
import logger from '../utils/logger'

const router = Router()

// POST /api/webhooks/stripe — procesar eventos de Stripe
router.post('/stripe', async (req, res, next) => {
  try {
    const evento = req.body
    logger.info({ tipo: evento.type }, 'Webhook de Stripe recibido')

    // Placeholder — en producción verificar firma de Stripe antes de procesar
    // const sig = req.headers['stripe-signature']
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    // const eventoVerificado = stripe.webhooks.constructEvent(
    //   req.body,
    //   sig!,
    //   process.env.STRIPE_WEBHOOK_SECRET!
    // )

    // Despachar según tipo de evento recibido
    switch (evento.type) {
      case 'checkout.session.completed':
        // Activar suscripción del usuario en la base de datos
        logger.info({ sesionId: evento.data?.object?.id }, 'Pago completado — activar suscripción')
        break

      case 'customer.subscription.updated':
        // Sincronizar cambios de plan (upgrade/downgrade)
        logger.info({ suscripcionId: evento.data?.object?.id }, 'Suscripción actualizada')
        break

      case 'customer.subscription.deleted':
        // Revertir al plan gratuito cuando se cancela
        logger.info({ suscripcionId: evento.data?.object?.id }, 'Suscripción cancelada')
        break

      case 'invoice.payment_failed':
        // Notificar al usuario sobre fallo en el pago
        logger.warn({ facturaId: evento.data?.object?.id }, 'Pago fallido — notificar al usuario')
        break

      default:
        // Registrar eventos no manejados para revisión futura
        logger.debug({ tipo: evento.type }, 'Evento de Stripe no manejado')
    }

    // Responder con 200 para confirmar recepción a Stripe
    res.json({ recibido: true })
  } catch (error) {
    next(error)
  }
})

export default router
