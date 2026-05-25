import cron from 'node-cron'
import logger from '../utils/logger'
import { jobSincronizarTodosLosTenants } from './sincronizar-meta'
import { jobCalcularFeatures } from './calcular-features'

// ---------------------------------------------------------------------------
// Tipos y definición de jobs
// ---------------------------------------------------------------------------

interface CronJob {
  nombre: string
  expresion: string
  handler: () => Promise<void>
  tarea?: cron.ScheduledTask
}

// Todos los jobs programados del sistema DivinADS
// Cada job que se agregue aquí será iniciado automáticamente al levantar el servidor
const JOBS: CronJob[] = [
  {
    // Sincronización de campañas y métricas desde Meta Ads API a Supabase
    nombre:    'sincronizar-meta',
    expresion: '*/15 * * * *', // Cada 15 minutos
    handler:   jobSincronizarTodosLosTenants,
  },
  {
    // Pipeline de feature engineering: calcula features estadísticos por campaña
    // Corre 5 minutos después de la sincronización para tener datos frescos
    nombre:    'calcular-features',
    expresion: '5,20,35,50 * * * *', // A los :05, :20, :35 y :50 de cada hora
    handler:   jobCalcularFeatures,
  },
  // TODO Paso 15: detectar-anomalias — agregar job de detección de anomalías aquí
]

// ---------------------------------------------------------------------------
// Funciones de control del scheduler
// ---------------------------------------------------------------------------

// Iniciar todos los cron jobs definidos en JOBS
// Llamar desde server.ts en el callback de app.listen()
export function iniciarScheduler(): void {
  logger.info(
    { totalJobs: JOBS.length },
    `Iniciando scheduler con ${JOBS.length} job(s) configurado(s)`,
  )

  JOBS.forEach(job => {
    // Validar la expresión cron antes de registrar
    if (!cron.validate(job.expresion)) {
      logger.error(
        { job: job.nombre, expresion: job.expresion },
        'Expresión cron inválida — job NO será registrado',
      )
      return
    }

    // Registrar el job con zona horaria LATAM
    job.tarea = cron.schedule(
      job.expresion,
      async () => {
        logger.debug({ job: job.nombre }, `Disparando job programado: ${job.nombre}`)

        try {
          await job.handler()
        } catch (error) {
          // Capa de seguridad extra — los handlers ya deberían capturar sus errores
          logger.error(
            { error, job: job.nombre },
            `Error no capturado en job ${job.nombre} — el scheduler continúa`,
          )
        }
      },
      {
        timezone: 'America/Argentina/Buenos_Aires', // Zona horaria principal LATAM
      },
    )

    logger.info(
      { job: job.nombre, expresion: job.expresion },
      `Job registrado y activo: ${job.nombre}`,
    )
  })

  logger.info('Scheduler iniciado — todos los jobs están corriendo')
}

// Detener todos los jobs activos de forma ordenada
// Llamar desde los handlers SIGTERM / SIGINT para graceful shutdown
export function detenerScheduler(): void {
  logger.info('Deteniendo scheduler...')

  JOBS.forEach(job => {
    if (job.tarea) {
      job.tarea.stop()
      logger.info({ job: job.nombre }, `Job detenido: ${job.nombre}`)
    }
  })

  logger.info('Scheduler detenido — todos los jobs han sido cancelados')
}
