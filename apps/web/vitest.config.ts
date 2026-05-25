// ---------------------------------------------------------------------------
// Configuración de Vitest para el frontend (apps/web)
// Entorno jsdom — simula el navegador para testear código del cliente
// ---------------------------------------------------------------------------

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  test: {
    // Entorno jsdom para simular APIs del navegador (Intl, etc.)
    environment: 'jsdom',

    // Buscar tests en la carpeta __tests__ junto a los archivos fuente
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],

    // Reporte de resultados en la consola
    reporters: ['verbose'],
  },

  resolve: {
    alias: {
      // Alias de Next.js para importaciones absolutas desde src/
      '@': path.resolve(__dirname, './src'),
    },
  },
})
