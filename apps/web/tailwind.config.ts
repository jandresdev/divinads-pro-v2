import type { Config } from 'tailwindcss'

// Configuración de Tailwind CSS para DivinADS
const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de colores DivinADS
        primary: {
          DEFAULT: '#6366f1', // índigo
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#8b5cf6', // violeta
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: '#06b6d4', // cian
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#10b981',
          foreground: '#ffffff',
        },
        background: '#0f1117',      // fondo oscuro principal
        foreground: '#f8fafc',      // texto principal
        card: '#1a1f2e',            // fondo de cards
        'card-foreground': '#f8fafc',
        border: '#2d3748',          // bordes
        input: '#1e2433',           // inputs
        ring: '#6366f1',            // focus ring
        muted: '#6b7280',           // texto secundario
        'muted-foreground': '#9ca3af',
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        // Animaciones para el dashboard
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-in-out',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
