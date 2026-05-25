import { z } from 'zod'

// Esquema de variables de entorno requeridas
const esquemaEnv = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  REDIS_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
})

// Exportar env validado y tipado
export type Env = z.infer<typeof esquemaEnv>

// Parsear y lanzar error descriptivo si falta algo crítico
function cargarEnv(): Env {
  const resultado = esquemaEnv.safeParse(process.env)
  if (!resultado.success) {
    console.error('❌ Variables de entorno inválidas:')
    resultado.error.issues.forEach(issue => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    })
    // No detener el proceso en desarrollo si falta API key
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  }
  return (resultado.data ?? process.env) as Env
}

export const env = cargarEnv()
