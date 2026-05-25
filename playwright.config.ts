// ---------------------------------------------------------------------------
// Configuración de Playwright para tests E2E de DivinADS
// Tests contra el servidor de desarrollo en localhost:3000
// ---------------------------------------------------------------------------

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // Carpeta donde viven los tests E2E
  testDir: './e2e',

  // Patrón de archivos de test
  testMatch: '**/*.spec.ts',

  // Timeout por test: 30 segundos
  timeout: 30_000,

  // Timeout para expect: 10 segundos
  expect: {
    timeout: 10_000,
  },

  // No reintentar tests que fallan (en CI sin servidor deben hacer skip)
  retries: 0,

  // Reportes de resultados
  reporter: [['list'], ['html', { open: 'never' }]],

  // Configuración global del navegador
  use: {
    // URL base del frontend en desarrollo
    baseURL: 'http://localhost:3000',

    // Capturar trazas solo cuando un test falla
    trace: 'on-first-retry',

    // Screenshot solo en caso de fallo
    screenshot: 'only-on-failure',
  },

  // Proyectos: Chromium es suficiente para los flujos críticos
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No iniciar el servidor automáticamente — los tests hacen skip si no está corriendo
  // webServer: { command: 'pnpm dev:web', url: 'http://localhost:3000', reuseExistingServer: true },
})
