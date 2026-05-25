import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { pinoHttp } from 'pino-http'
import dotenv from 'dotenv'

// Cargar variables de entorno al inicio
dotenv.config()

import { manejadorErrores } from './middleware/manejadorErrores'
import rutasCampañas from './routes/campañas'
import rutasMetricas from './routes/metricas'
import rutasAnomalias from './routes/anomalias'
import rutasAgente from './routes/agente'
import rutasChat from './routes/chat'
import rutasMetaConfig from './routes/meta-config'
import logger from './utils/logger'

const app = express()
const PUERTO = process.env.PORT || 3001

// --- Middleware de seguridad ---
app.use(helmet())

// CORS — solo permitir el frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Logging HTTP
app.use(pinoHttp({ logger }))

// Rate limiting global
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { exito: false, error: 'Demasiadas peticiones, intenta en un minuto' },
  standardHeaders: true,
  legacyHeaders: false,
}))

// --- Rutas de salud ---
app.get('/health', (req, res) => {
  res.json({
    estado: 'activo',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ambiente: process.env.NODE_ENV || 'desarrollo',
    servicios: {
      api: 'activo',
      agente: 'pendiente',
    },
  })
})

// --- Rutas de la API ---
app.use('/api/campanas', rutasCampañas)
app.use('/api/metricas', rutasMetricas)
app.use('/api/anomalias', rutasAnomalias)
app.use('/api/agente', rutasAgente)
app.use('/api/chat', rutasChat)
app.use('/api/meta', rutasMetaConfig)

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    nombre: 'DivinADS API',
    version: '1.0.0',
    endpoints: ['/api/campanas', '/api/metricas', '/api/anomalias', '/api/agente', '/api/chat', '/api/meta'],
    documentacion: '/health',
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    exito: false,
    error: 'Ruta no encontrada',
    ruta: req.originalUrl,
  })
})

// --- Manejo global de errores (siempre al final) ---
app.use(manejadorErrores)

// --- Iniciar servidor ---
app.listen(PUERTO, () => {
  logger.info(`Servidor DivinADS API iniciado en puerto ${PUERTO}`)
  logger.info(`Ambiente: ${process.env.NODE_ENV || 'desarrollo'}`)
})

export default app
