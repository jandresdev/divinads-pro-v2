import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import { ErrorNoAutorizado } from '../utils/errores'

// Extender Request de Express para incluir usuario autenticado
declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: string
        email: string
        tenantId: string
      }
    }
  }
}

// Crear cliente Supabase con Service Role para verificar tokens
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Middleware de autenticación — verifica Bearer token de Supabase
export async function requerirAutenticacion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      throw new ErrorNoAutorizado('Se requiere token de autenticación')
    }

    const token = authHeader.split(' ')[1]

    // Verificar token con Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      throw new ErrorNoAutorizado('Token inválido o expirado')
    }

    // Obtener tenant_id del usuario desde la tabla tenant_members
    const { data: miembro } = await supabaseAdmin
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    // Adjuntar usuario al request
    req.usuario = {
      id: user.id,
      email: user.email!,
      tenantId: miembro?.tenant_id ?? user.id, // fallback al user.id si no tiene tenant aún
    }

    next()
  } catch (error) {
    next(error)
  }
}
