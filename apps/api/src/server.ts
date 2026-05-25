import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { pinoHttp } from 'pino-http'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

const app = express()
const PUERTO = process.env.PORT || 3001

// Middleware de seguridad
app.use(helmet())

// Configuración CORS - permite peticiones del frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))

// Parsing de JSON
app.use(express.json({ limit: '10mb' }))

// Logging de peticiones HTTP
app.use(pinoHttp({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
}))

// Rate limiting global
const limitadorGeneral = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  message: { error: 'Demasiadas peticiones, intenta de nuevo en un minuto' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limitadorGeneral)

// Ruta de salud del servidor
app.get('/health', (req, res) => {
  res.json({
    estado: 'activo',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ambiente: process.env.NODE_ENV || 'desarrollo',
  })
})

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    mensaje: 'API DivinADS - Motor de Inteligencia y Agente Autónomo',
    version: '1.0.0',
    documentacion: '/api/docs',
  })
})

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    ruta: req.originalUrl,
  })
})

// Manejo global de errores
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error del servidor:', err)
  res.status(500).json({
    error: 'Error interno del servidor',
    mensaje: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal',
  })
})

// Iniciar servidor
app.listen(PUERTO, () => {
  console.log(`Servidor DivinADS API iniciado en puerto ${PUERTO}`)
  console.log(`Ambiente: ${process.env.NODE_ENV || 'desarrollo'}`)
})

export default app
