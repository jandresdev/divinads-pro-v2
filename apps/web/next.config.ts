import type { NextConfig } from 'next'

// Configuración de Next.js para DivinADS
const nextConfig: NextConfig = {
  experimental: {
    // Habilitar Turbopack para desarrollo más rápido
    turbo: {},
  },
}

export default nextConfig
