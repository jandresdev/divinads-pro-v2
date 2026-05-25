import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { ErrorApp, ErrorValidacion } from '../utils/errores'
import logger from '../utils/logger'

// Middleware de manejo de errores — debe ir al final del app
export function manejadorErrores(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Errores de validación Zod
  if (error instanceof ZodError) {
    const campos: Record<string, string> = {}
    error.errors.forEach(e => {
      campos[e.path.join('.')] = e.message
    })
    res.status(422).json({
      exito: false,
      error: 'Error de validación',
      campos,
    })
    return
  }

  // Errores personalizados de la app
  if (error instanceof ErrorValidacion) {
    res.status(422).json({
      exito: false,
      error: error.message,
      campos: error.campos,
    })
    return
  }

  if (error instanceof ErrorApp) {
    if (!error.esOperacional) {
      logger.error({ error }, 'Error no operacional')
    }
    res.status(error.codigo).json({
      exito: false,
      error: error.message,
    })
    return
  }

  // Error desconocido
  logger.error({ error }, 'Error inesperado del servidor')
  res.status(500).json({
    exito: false,
    error: 'Error interno del servidor',
    mensaje: process.env.NODE_ENV === 'development' ? String(error) : 'Algo salió mal',
  })
}
