# ============================================================
# DivinADS API — Dockerfile de produccion
# Multi-stage build: builder (compilacion) + runner (ejecucion)
# Imagen base: Node.js 20 Alpine (minima, segura, liviana)
# ============================================================

# -----------------------------------------------------------
# Etapa 1: Builder — instalar dependencias y compilar TypeScript
# -----------------------------------------------------------
FROM node:20-alpine AS builder

# Instalar pnpm globalmente
RUN npm install -g pnpm@9

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar archivos de configuracion del monorepo
# Se copian primero para aprovechar la cache de Docker
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./

# Copiar el package.json del workspace de la API
COPY apps/api/package.json ./apps/api/

# Copiar el package compartido si existe
COPY packages/ ./packages/

# Instalar TODAS las dependencias (incluyendo devDependencies para compilar)
RUN pnpm install --frozen-lockfile

# Copiar el codigo fuente de la API
COPY apps/api/src/ ./apps/api/src/
COPY apps/api/tsconfig.json ./apps/api/

# Compilar TypeScript a JavaScript
RUN pnpm --filter api build

# -----------------------------------------------------------
# Etapa 2: Runner — imagen minima solo con lo necesario
# -----------------------------------------------------------
FROM node:20-alpine AS runner

# Instalar pnpm globalmente (necesario para instalar solo prod deps)
RUN npm install -g pnpm@9

# Crear usuario no-root por seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 divinads

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de configuracion del monorepo (para pnpm workspaces)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copiar package.json de la API
COPY apps/api/package.json ./apps/api/

# Copiar paquetes compartidos si existen
COPY packages/ ./packages/

# Instalar SOLO dependencias de produccion (sin devDependencies)
RUN pnpm install --frozen-lockfile --prod

# Copiar el build compilado desde la etapa builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Cambiar al usuario no-root
USER divinads

# Puerto expuesto por la API Express
EXPOSE 3001

# Variables de entorno por defecto (se sobreescriben en Railway)
ENV NODE_ENV=production
ENV PORT=3001

# Comando de inicio — ejecutar directamente desde el JS compilado
CMD ["node", "apps/api/dist/server.js"]
