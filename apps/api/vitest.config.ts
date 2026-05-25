// ---------------------------------------------------------------------------
// Configuración de Vitest para el backend (apps/api)
// Entorno Node.js — sin DOM, sin browser APIs
// ---------------------------------------------------------------------------

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Entorno Node.js puro para el backend Express
    environment: 'node',

    // Buscar tests en la carpeta __tests__ junto a los archivos fuente
    include: ['src/**/__tests__/**/*.test.ts'],

    // Reporte de resultados en la consola
    reporters: ['verbose'],

    // Mostrar cobertura básica
    coverage: {
      provider: 'v8',
      include: ['src/services/**/*.ts'],
    },
  },
})
