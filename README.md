# DivinADS Pro

**Tu VP de Marketing autónomo que cuesta $99/mes, ejecuta decisiones 10x/día, y mejora cada semana.**

DivinADS es una plataforma SaaS multi-tenant especializada en LATAM que transforma datos crudos de Meta Ads en inteligencia accionable ejecutada por un agente autónomo de IA.

## ¿Qué Hace DivinADS?

| Función | Descripción | Frecuencia |
|---------|-------------|------------|
| **Monitorea** | Vigilancia 24/7 de campañas. Alertas en tiempo real | Cada 15 minutos |
| **Analiza** | Root cause analysis automático de anomalías | Cuando detecta anomalía |
| **Recomienda** | 2-3 opciones de acción con confianza % | Cuando hay anomalía |
| **Ejecuta** | Pausa/escala presupuestos automáticamente | Auto si < $100, manual si > $100 |
| **Explica** | Conversación natural en español sobre decisiones | Siempre |
| **Aprende** | Mejora con cada decisión tomada | Ciclo de 48h |

## Stack Tecnológico

- **Frontend:** Next.js 15 + Tailwind CSS + shadcn/ui + Recharts
- **Backend:** Express + Node.js + TypeScript
- **Base de Datos:** PostgreSQL (Supabase) con Row-Level Security
- **Agente IA:** Claude API (Anthropic) con tool_use
- **Auth:** Supabase Auth + PKCE
- **Pagos:** Stripe

## Inicio Rápido

### Prerrequisitos

- Node.js 18+
- pnpm 9+
- Cuenta Supabase
- Clave API de Anthropic

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/jandresdev/divinads-pro-v2.git
cd divinads-pro-v2

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Iniciar desarrollo
pnpm dev
```

## Estructura del Proyecto

```
divinads-pro-v2/
├── apps/
│   ├── web/          # Frontend Next.js 15
│   └── api/          # Backend Express
├── packages/
│   └── shared/       # Tipos y constantes compartidas
└── docs/             # Documentación
```

## Documentación

- [API REST](./docs/API.md)
- [Flujo del Agente](./docs/AGENT.md)
- [Deployment](./docs/DEPLOYMENT.md)

## Licencia

MIT - Ver [LICENSE](LICENSE)

---

Construido con para LATAM
