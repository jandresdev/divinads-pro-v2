# Guia de Deployment — DivinADS Pro

Esta guia cubre el proceso completo para desplegar DivinADS en produccion:
- **Frontend:** Vercel
- **Backend:** Railway (con Dockerfile)
- **Base de Datos:** Supabase (sa-east-1, São Paulo)

---

## Indice

1. [Prerrequisitos](#prerrequisitos)
2. [Setup de Supabase](#setup-de-supabase)
3. [Setup de Vercel (Frontend)](#setup-de-vercel-frontend)
4. [Setup de Railway (Backend)](#setup-de-railway-backend)
5. [Variables de Entorno por Servicio](#variables-de-entorno-por-servicio)
6. [Checklist Pre-Deploy](#checklist-pre-deploy)
7. [Verificacion Post-Deploy](#verificacion-post-deploy)

---

## Prerrequisitos

Antes de comenzar asegurate de tener:

- [ ] Cuenta en [Supabase](https://supabase.com) con proyecto creado en region **sa-east-1** (São Paulo)
- [ ] Cuenta en [Vercel](https://vercel.com) conectada a GitHub
- [ ] Cuenta en [Railway](https://railway.app) con billing activo
- [ ] App creada en [Meta for Developers](https://developers.facebook.com) con permisos de Ads
- [ ] Clave API de [Anthropic](https://console.anthropic.com)
- [ ] Cuenta de [Stripe](https://dashboard.stripe.com) con modo live activado
- [ ] Repositorio en GitHub con el codigo de DivinADS

---

## Setup de Supabase

### 1. Crear el Proyecto

1. Ir a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Crear nuevo proyecto:
   - **Nombre:** `divinads-pro-v2`
   - **Region:** South America (São Paulo) — `sa-east-1`
   - **Password:** una password segura (guardar en un gestor de contraseñas)

### 2. Obtener Credenciales

En el dashboard del proyecto ir a **Settings > API**:

| Variable | Donde esta |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` `secret` |

En **Settings > Database**:

| Variable | Donde esta |
|----------|------------|
| `DATABASE_URL` | Connection string > URI (modo `Transaction` para Railway) |

> **Importante:** Para Railway usar el connection string en modo **Transaction** (puerto 6543), no el directo (5432), ya que Railway usa conexiones efimeras.

### 3. Ejecutar Migraciones

Las migraciones estan en `apps/api/src/db/migrations/`. Ejecutar en orden desde el SQL Editor de Supabase o con Drizzle:

```bash
# Con Drizzle Kit (desde apps/api/)
pnpm --filter api exec drizzle-kit push
```

O ejecutar los archivos SQL directamente en el SQL Editor de Supabase:

```
apps/api/src/db/migrations/
├── 0001_initial_schema.sql      # Tablas base: tenants, users, campaigns
├── 0002_metrics_snapshots.sql   # Snapshots de metricas diarias
├── 0003_anomalies.sql           # Tabla de anomalias detectadas
├── 0004_agent_actions.sql       # Log de acciones del agente
└── 0005_chat_messages.sql       # Historial de conversaciones
```

### 4. Configurar Row-Level Security

Verificar que RLS esta habilitado en todas las tablas:

```sql
-- Verificar RLS activo
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

Todas las tablas deben tener `rowsecurity = true`.

### 5. Configurar Auth

En **Authentication > Settings**:

- **Site URL:** `https://tu-dominio.vercel.app`
- **Redirect URLs:** agregar `https://tu-dominio.vercel.app/auth/callback`
- **Email confirmations:** activar para produccion

---

## Setup de Vercel (Frontend)

### 1. Conectar Repositorio

1. Ir a [vercel.com/new](https://vercel.com/new)
2. Seleccionar el repositorio `divinads-pro-v2` de GitHub
3. Configurar el proyecto:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `pnpm build` (Vercel lo detecta automaticamente)
   - **Output Directory:** `.next`
   - **Install Command:** `pnpm install`

### 2. Variables de Entorno en Vercel

En **Settings > Environment Variables** agregar:

```
NEXT_PUBLIC_SUPABASE_URL=https://qttjzxtcrnbkeocgxtgu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key del dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_API_URL=https://divinads-api.railway.app
ANTHROPIC_API_KEY=sk-ant-xxx
```

> Aplicar las variables a los entornos: Production, Preview, Development.

### 3. Deployment Automatico

Vercel despliega automaticamente en cada push a `main`. Para hacer un deploy manual:

```
Vercel Dashboard > tu-proyecto > Deployments > Deploy
```

### 4. Dominio Custom (Opcional)

En **Settings > Domains**:
- Agregar `app.divinads.com` (o el dominio propio)
- Seguir las instrucciones para configurar DNS

---

## Setup de Railway (Backend)

### 1. Crear el Servicio

1. Ir a [railway.app](https://railway.app) y crear un nuevo proyecto
2. Seleccionar **Deploy from GitHub repo**
3. Seleccionar el repositorio `divinads-pro-v2`
4. En la configuracion del servicio:
   - **Root Directory:** `apps/api`
   - **Dockerfile Path:** `apps/api/Dockerfile`

Railway detecta automaticamente el `Dockerfile` y usa multi-stage build.

### 2. Variables de Entorno en Railway

En el panel del servicio ir a **Variables** y agregar:

```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:<password>@<host>:6543/postgres?sslmode=require
REDIS_URL=redis://:password@host:6379
SUPABASE_SERVICE_ROLE_KEY=<service role key>
NEXT_PUBLIC_SUPABASE_URL=https://qttjzxtcrnbkeocgxtgu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
META_APP_ID=<tu app id>
META_APP_SECRET=<tu app secret>
META_API_VERSION=v20.0
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
FRONTEND_URL=https://tu-dominio.vercel.app
```

### 3. Agregar Redis en Railway

1. En el mismo proyecto de Railway, hacer click en **New** > **Database** > **Add Redis**
2. Railway crea automaticamente la variable `REDIS_URL` y la vincula al servicio

### 4. Health Check

Railway necesita saber cuando el servicio esta listo. Configurar en **Settings > Deploy**:

- **Health Check Path:** `/health`
- **Health Check Timeout:** 30s

### 5. Webhook de Stripe

Una vez desplegada la API, configurar el webhook en Stripe:

1. Ir a [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Agregar endpoint: `https://divinads-api.railway.app/api/webhooks/stripe`
3. Seleccionar los eventos:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copiar el **Signing secret** y actualizar `STRIPE_WEBHOOK_SECRET` en Railway

---

## Variables de Entorno por Servicio

### Supabase

| Variable | Descripcion |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anonima (pública, segura para el cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role (solo backend, NUNCA exponer al cliente) |
| `DATABASE_URL` | Connection string PostgreSQL (modo Transaction para Railway) |

### Meta Ads

| Variable | Descripcion |
|----------|-------------|
| `META_APP_ID` | ID de la aplicacion de Meta |
| `META_APP_SECRET` | Secret de la aplicacion |
| `META_API_VERSION` | Version de la API (ej: `v20.0`) |

### Anthropic

| Variable | Descripcion |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Clave API para Claude (agente + chat) |

### OpenAI

| Variable | Descripcion |
|----------|-------------|
| `OPENAI_API_KEY` | Clave API para embeddings (busqueda semantica de conversaciones) |

### Stripe

| Variable | Descripcion |
|----------|-------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave publica (frontend) |
| `STRIPE_SECRET_KEY` | Clave secreta (backend) |
| `STRIPE_WEBHOOK_SECRET` | Secret para verificar eventos de webhook |

### Infraestructura

| Variable | Descripcion |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `API_URL` | URL interna de la API (ej: `https://divinads-api.railway.app`) |
| `NEXT_PUBLIC_API_URL` | URL publica de la API (accesible desde el browser) |
| `FRONTEND_URL` | URL del frontend (para CORS en la API) |
| `NODE_ENV` | `production` en produccion |
| `PORT` | Puerto del servidor Express (Railway usa `3001`) |

---

## Checklist Pre-Deploy

Verificar antes de hacer el primer deploy a produccion:

### Supabase
- [ ] Proyecto creado en region sa-east-1
- [ ] Migraciones ejecutadas y tablas creadas
- [ ] RLS habilitado en todas las tablas
- [ ] Auth configurado con URLs correctas
- [ ] Credenciales copiadas y guardadas de forma segura

### Codigo
- [ ] Tests unitarios pasando: `pnpm test` (API: 92 tests, Web: 38 tests)
- [ ] TypeScript sin errores: `pnpm --filter api exec tsc --noEmit`
- [ ] Build de produccion exitoso: `pnpm --filter web build`
- [ ] `.env.example` actualizado con todas las variables necesarias
- [ ] No hay credenciales hardcodeadas en el codigo

### Vercel
- [ ] Repositorio conectado correctamente
- [ ] Root Directory configurado en `apps/web`
- [ ] Todas las variables de entorno cargadas
- [ ] Build de preview exitoso en PR

### Railway
- [ ] Servicio creado con Dockerfile detectado
- [ ] Redis agregado al proyecto
- [ ] Variables de entorno cargadas
- [ ] Health check configurado en `/health`
- [ ] Webhook de Stripe configurado

### Stripe
- [ ] Webhook apuntando a la URL de produccion de Railway
- [ ] Eventos seleccionados correctamente
- [ ] `STRIPE_WEBHOOK_SECRET` actualizado en Railway

---

## Verificacion Post-Deploy

### 1. Verificar API

```bash
# Health check de la API
curl https://divinads-api.railway.app/health

# Respuesta esperada:
# {
#   "estado": "activo",
#   "version": "1.0.0",
#   "timestamp": "2026-01-01T00:00:00.000Z",
#   "ambiente": "production",
#   "servicios": { "api": "activo", "agente": "pendiente" }
# }
```

### 2. Verificar Frontend

```bash
# Verificar que el frontend carga correctamente
curl -I https://tu-dominio.vercel.app

# Respuesta esperada: HTTP/2 200
```

### 3. Verificar Autenticacion

1. Ir a `https://tu-dominio.vercel.app/auth/login`
2. Registrar una cuenta nueva
3. Verificar que llega el email de confirmacion
4. Confirmar email y verificar que redirige al dashboard

### 4. Verificar Jobs de Sincronizacion

En los logs de Railway verificar que el cron de sincronizacion Meta se ejecuta cada 15 minutos:

```
# En Railway Dashboard > Servicio > Logs
[INFO] Scheduler de sincronizacion Meta iniciado
[INFO] Job META_SYNC ejecutado — 0 campañas sincronizadas (sin cuentas vinculadas)
```

### 5. Verificar Stripe Webhook

En el dashboard de Stripe ir a **Webhooks** y verificar que el endpoint muestra `200 OK` en los ultimos eventos.

### 6. Verificar CORS

```bash
# Verificar que la API acepta peticiones del frontend
curl -H "Origin: https://tu-dominio.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://divinads-api.railway.app/health

# Respuesta esperada: 204 No Content con headers de CORS
```

### 7. Smoke Test Completo

```bash
# Obtener un JWT de Supabase (con una cuenta de prueba)
export JWT="eyJ..."

# Listar campañas (debe retornar array vacio)
curl -H "Authorization: Bearer $JWT" \
     https://divinads-api.railway.app/api/campanas

# Respuesta esperada:
# { "exito": true, "datos": [], "meta": { "total": 0 } }
```

---

## Rollback de Emergencia

### Vercel

En el dashboard de Vercel ir a **Deployments**, seleccionar el deployment anterior y hacer click en **Promote to Production**.

### Railway

Railway guarda el historial de deployments. En el servicio ir a **Deployments**, seleccionar el deployment anterior y hacer **Rollback**.

---

## Monitoreo en Produccion

| Herramienta | URL | Que monitorear |
|-------------|-----|----------------|
| Vercel Analytics | Dashboard Vercel | Latencia, errores, Web Vitals |
| Railway Logs | Dashboard Railway | Errores de la API, jobs, crashes |
| Supabase Logs | Dashboard Supabase | Queries lentas, errores de auth |
| Stripe Dashboard | dashboard.stripe.com | Pagos, webhooks fallidos |

---

## Contacto y Soporte

Para reportar problemas de deployment abrir un issue en el repositorio de GitHub con:
- Descripcion del error
- Logs relevantes (censurar credenciales)
- Entorno afectado (Vercel/Railway/Supabase)
