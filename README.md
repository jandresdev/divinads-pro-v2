# DivinADS Pro

**Tu VP de Marketing autónomo que cuesta $99/mes, ejecuta decisiones 10x/día, y mejora cada semana.**

DivinADS es una plataforma SaaS multi-tenant especializada en LATAM que transforma datos crudos de Meta Ads en inteligencia accionable ejecutada por un agente autónomo de IA.

---

## ¿Qué Hace DivinADS?

| Función | Descripcion | Frecuencia |
|---------|-------------|------------|
| **Monitorea** | Vigilancia 24/7 de campañas. Alertas en tiempo real | Cada 15 minutos |
| **Analiza** | Root cause analysis automático de anomalías | Cuando detecta anomalía |
| **Recomienda** | 2-3 opciones de acción con confianza % | Cuando hay anomalía |
| **Ejecuta** | Pausa/escala presupuestos automáticamente | Auto si < $100, manual si > $100 |
| **Explica** | Conversación natural en español sobre decisiones | Siempre |
| **Aprende** | Mejora con cada decisión tomada | Ciclo de 48h |

---

## Stack Tecnológico

| Capa | Tecnología | Version |
|------|------------|---------|
| **Frontend** | Next.js + Tailwind CSS v4 + shadcn/ui + Recharts | Next.js 15 |
| **Backend** | Express + Node.js + TypeScript | Node.js 20 |
| **Base de Datos** | PostgreSQL con Row-Level Security | Supabase (sa-east-1) |
| **Agente IA** | Claude API con tool_use | Anthropic SDK 0.24 |
| **Auth** | Supabase Auth + PKCE | - |
| **Pagos** | Stripe | - |
| **ORM** | Drizzle ORM | 0.31 |
| **Cache / Colas** | Redis + Bull | - |
| **Monorepo** | pnpm workspaces + Turborepo | pnpm 9 |
| **Tests** | Vitest + Playwright | - |
| **CI/CD** | GitHub Actions | - |

---

## Arquitectura

```
                     ┌─────────────────────────────────┐
                     │          Usuario / Browser       │
                     └────────────┬────────────────────┘
                                  │ HTTPS
                     ┌────────────▼────────────────────┐
                     │      Vercel (CDN Global)         │
                     │   apps/web — Next.js 15 App      │
                     │   - Dashboard, Auth, Chat        │
                     │   - TanStack Query + shadcn/ui   │
                     └────────────┬────────────────────┘
                                  │ REST API / SSE
                     ┌────────────▼────────────────────┐
                     │   Railway (apps/api — Express)   │
                     │   - Rutas CRUD campañas          │
                     │   - Agente Claude (tool_use)     │
                     │   - Jobs Meta Ads (cron 15min)   │
                     │   - Webhooks Stripe              │
                     └──────┬──────────────┬───────────┘
                            │              │
           ┌────────────────▼──┐    ┌──────▼──────────────┐
           │  Supabase Postgres │    │   Redis (Bull)       │
           │  - RLS multi-tenant│    │   - Job queue        │
           │  - Auth PKCE       │    │   - Rate limiting    │
           └───────────────────┘    └─────────────────────┘
                            │
           ┌────────────────▼──┐
           │   APIs Externas    │
           │  - Meta Ads v20    │
           │  - Anthropic Claude│
           │  - Stripe          │
           └───────────────────┘
```

---

## Instalacion Local

### Prerrequisitos

- Node.js 20+
- pnpm 9+
- Cuenta Supabase (proyecto creado)
- Clave API de Anthropic
- Redis (local o Railway)

### Paso a Paso

```bash
# 1. Clonar el repositorio
git clone https://github.com/jandresdev/divinads-pro-v2.git
cd divinads-pro-v2

# 2. Instalar dependencias (todos los workspaces)
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales reales
```

Edita `.env.local` con los valores reales (ver sección Variables de Entorno).

```bash
# 4. Iniciar desarrollo (frontend + backend en paralelo)
pnpm dev

# O iniciar cada servicio por separado:
pnpm dev:web   # Next.js en http://localhost:3000
pnpm dev:api   # Express en http://localhost:3001
```

---

## Variables de Entorno Requeridas

Copia `.env.example` a `.env.local` y completa:

| Variable | Descripcion | Donde obtenerla |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Dashboard Supabase > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon pública | Dashboard Supabase > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role (secreta) | Dashboard Supabase > Settings > API |
| `META_APP_ID` | ID de la app de Meta | Meta for Developers |
| `META_APP_SECRET` | Secret de la app de Meta | Meta for Developers |
| `META_API_VERSION` | Version de la API (ej: v20.0) | Meta Docs |
| `ANTHROPIC_API_KEY` | Clave API de Anthropic | console.anthropic.com |
| `OPENAI_API_KEY` | Clave API de OpenAI (embeddings) | platform.openai.com |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave pública de Stripe | dashboard.stripe.com |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe | dashboard.stripe.com |
| `STRIPE_WEBHOOK_SECRET` | Secret del webhook de Stripe | dashboard.stripe.com > Webhooks |
| `DATABASE_URL` | URL de conexión PostgreSQL | Supabase > Settings > Database |
| `REDIS_URL` | URL de conexión Redis | Railway o local |
| `API_URL` | URL interna de la API | `http://localhost:3001` en dev |
| `NEXT_PUBLIC_API_URL` | URL pública de la API | `http://localhost:3001` en dev |
| `FRONTEND_URL` | URL del frontend | `http://localhost:3000` en dev |

---

## Comandos Disponibles

### Raiz del monorepo

```bash
pnpm dev          # Iniciar frontend + backend en paralelo (Turborepo)
pnpm build        # Build de produccion de todos los workspaces
pnpm test         # Ejecutar todos los tests unitarios
pnpm test:e2e     # Ejecutar tests end-to-end con Playwright
pnpm lint         # Lint de todos los workspaces
pnpm dev:web      # Solo frontend (Next.js)
pnpm dev:api      # Solo backend (Express)
```

### Frontend (`apps/web`)

```bash
pnpm --filter web dev      # Dev server en localhost:3000
pnpm --filter web build    # Build de produccion
pnpm --filter web test     # 38 tests unitarios (Vitest)
pnpm --filter web lint     # ESLint + TypeScript check
```

### Backend (`apps/api`)

```bash
pnpm --filter api dev      # Dev server con hot reload (tsx watch)
pnpm --filter api build    # Compilar TypeScript a dist/
pnpm --filter api start    # Iniciar desde dist/ (produccion)
pnpm --filter api test     # 92 tests unitarios (Vitest)
```

---

## Estructura del Proyecto

```
divinads-pro-v2/
├── apps/
│   ├── web/                    # Frontend Next.js 15
│   │   └── src/
│   │       ├── app/            # App Router de Next.js
│   │       │   ├── (app)/      # Rutas autenticadas (dashboard, chat, config)
│   │       │   ├── (marketing) # Paginas publicas (precios, landing)
│   │       │   └── auth/       # Paginas de login y registro
│   │       ├── components/     # Componentes React reutilizables
│   │       └── lib/            # Utilidades, hooks, queries
│   │
│   └── api/                    # Backend Express
│       └── src/
│           ├── routes/         # Endpoints REST
│           ├── services/       # Logica de negocio
│           ├── jobs/           # Cron jobs (Meta sync, agente monitor)
│           ├── middleware/      # Auth, rate limit, error handling
│           ├── db/             # Schema Drizzle + cliente Supabase
│           └── utils/          # Logger, helpers
│
├── packages/
│   └── shared/                 # Tipos TypeScript compartidos
│
├── .github/workflows/          # CI/CD con GitHub Actions
│   ├── ci.yml                  # Lint, typecheck, tests, build
│   └── deploy.yml              # Instrucciones de despliegue
│
├── e2e/                        # Tests Playwright end-to-end
├── docs/                       # Documentacion tecnica
├── .env.example                # Plantilla de variables de entorno
├── package.json                # Scripts del monorepo
├── pnpm-workspace.yaml         # Configuracion de workspaces
└── turbo.json                  # Pipeline de Turborepo
```

---

## Deployment

El stack se despliega en dos plataformas:

- **Frontend (`apps/web`):** Vercel — deployment automatico al hacer push a `main`
- **Backend (`apps/api`):** Railway — Dockerfile multi-stage, deployment automatico

Consulta la guia completa en [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

---

## Documentacion

- [API REST](./docs/API.md) — Endpoints, autenticacion, formato de respuestas
- [Flujo del Agente](./docs/AGENT.md) — Como funciona el agente autonomo
- [Guia de Deployment](./docs/DEPLOYMENT.md) — Instrucciones completas de produccion

---

## Licencia

MIT — Ver [LICENSE](LICENSE)

---

Construido con amor para LATAM
