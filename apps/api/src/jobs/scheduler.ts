import cron from 'node-cron'
import logger from '../utils/logger'
import { jobSincronizarTodosLosTenants } from './sincronizar-meta'
import { jobCalcularFeatures } from './calcular-features'
import { jobDetectarAnomalias } from './detectar-anomalias'
import { jobEntrenarModelos } from './entrenar-modelos'
import { jobAgenteMonitor } from './agente-monitor'
import { jobValidarResultados } from './validar-resultados'

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
  {
    // Motor de detección de anomalías: aplica reglas sobre los feature snapshots
    // Corre 5 minutos después del pipeline de features para tener datos actualizados
    nombre:    'detectar-anomalias',
    expresion: '10,25,40,55 * * * *', // A los :10, :25, :40 y :55 de cada hora
    handler:   jobDetectarAnomalias,
  },
  {
    // Pipeline de predicción ML: regresión lineal sobre historial de ROAS por campaña
    // Corre a las 3am cada 2 días — predicciones no necesitan actualizarse con mayor frecuencia
    nombre:    'generar-predicciones',
    expresion: '0 3 */2 * *', // A las 3am cada 2 días
    handler:   jobEntrenarModelos,
  },
  {
    // Agente monitor DivinADS: detecta anomalías críticas y dispara el análisis de Claude
    // Se ejecuta cada 15 minutos para reaccionar rápido ante caídas de ROAS o CTR
    nombre:    'agente-monitor',
    expresion: '*/15 * * * *', // Cada 15 minutos
    handler:   jobAgenteMonitor,
  },
  {
    // Ciclo de validación de 48h: evalúa si las acciones ejecutadas mejoraron las métricas
    // Corre cada 6 horas — solo procesa acciones que superaron la ventana de 48h
    nombre:    'validar-resultados',
    expresion: '0 */6 * * *', // Cada 6 horas (a las :00 de cada 6h)
    handler:   jobValidarResultados,
  },
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
