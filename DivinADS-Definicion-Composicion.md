# DivinADS — Definición & Composición de Producto
## Qué ES y Cómo Funciona

**Versión:** 1.0 | **Fecha:** Mayo 2026

---

## ¿Qué ES DivinADS?

### Definición Formal

**DivinADS** es una **plataforma SaaS web multi-tenant, responsive y especializada en LATAM**, que transforma los datos crudos de Meta Ads en **inteligencia accionable ejecutada por un agente autónomo de IA**, el cual toma decisiones de media buying en tiempo real sin intervención humana constante (dentro de guardrails definidos por el usuario).

### Definición Técnica

DivinADS es un **unified intelligence system** donde cada decisión de media buying ocurre en un ciclo continuo:

```
MONITOREO → ANÁLISIS → RECOMENDACIÓN → EJECUCIÓN → VALIDACIÓN → APRENDIZAJE
   (24/7)    (causality)   (multi-option)  (< 2 seg)  (48h post)   (model)
```

El humano es **guardián de estrategia**, no operador; el agente es **ejecutor de decisiones**, no asistente.

### Definición Ejecutiva (One-Liner)

> DivinADS es "el VP de Marketing autónomo que cuesta $99/mes, ejecuta decisiones 10x/día, y mejora cada semana porque aprende de 100K+ campañas en LATAM".

---

## ¿Qué Hace DivinADS?

### Funciones Principales

| Función | Descripción | Frecuencia |
|---|---|---|
| **Monitorea** | Vigilancia 24/7 de campañas. Alertas en real-time de anomalías: ROAS ↓, frequency ↑, CPC ↑, CTR ↓ | Cada 15 minutos |
| **Analiza** | Root cause analysis automático: ¿Por qué bajó ROAS? ¿Competidor lanzó? ¿Audience fatiga? ¿Seasonalidad? ¿Technical lag? | Real-time al detectar anomalía |
| **Recomienda** | Sugiere 2-3 opciones de acción con confianza % y justificación en lenguaje natural | Cuando hay anomalía |
| **Ejecuta** | Pausa/escala presupuestos, realoca budget entre campañas, ajusta bids — automáticamente en < 2 segundos | Auto si < $100, manual si > $100 |
| **Explica** | Conversación con el usuario: "pausé estas 3 campañas a las 14:32 porque ROAS cayó 25% en 4 horas, aquí está el análisis" | Always, en historial |
| **Aprende** | Cada acción genera datos → modelo de IA se entrena → siguientes decisiones son 2% mejores | Ciclo de 48h |
| **Reportea** | Genera reportes automáticos (PDF, CSV, email) que explican qué pasó y qué hizo el agente | Daily/Weekly |

---

## Composición del Producto (4 Capas Integradas)

### CAPA 1: Frontend — El Dashboard Visual

**Propósito:** Que el usuario VEA todo lo que pasa en sus campañas en un golpe de vista.

**Tecnología:** Next.js 14 + Tailwind CSS + Recharts/Tremor + Supabase Realtime

#### Secciones del Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  HEADER & NAVEGACIÓN                                           │
│  ├─ Selector de período (1 May - 31 May, o custom)           │
│  ├─ Comparación (vs período anterior)                         │
│  ├─ Filtros (por cuenta, campaña, tipo)                       │
│  └─ Search bar + Settings                                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1️⃣  KPI CARDS (Fila horizontal)                              │
│     ├─ Gasto: $38,972.45 (+18.6% vs período anterior)        │
│     ├─ ROAS: 4.52 (+7.24%)                                    │
│     ├─ CTR: 2.91% (+8.7%)                                     │
│     ├─ CPC: $0.73 (+6.3%)                                     │
│     ├─ Conversiones: 1,482 (+21.4%)                           │
│     └─ CPA: $26.29 (-15.8%)                                   │
│     [Cada card clickeable → drill-down]                        │
│                                                                │
│  2️⃣  GRÁFICO RENDIMIENTO (Multi-métrica)                      │
│     ├─ Líneas: Gasto (azul) / ROAS (púrpura) / Conversiones  │
│     ├─ Período: Últimos 30 días                               │
│     ├─ Comparación: Línea punteada = período anterior         │
│     ├─ X-axis: Fechas (cada 5 días)                           │
│     ├─ Y-axis: Valores escalables                             │
│     └─ Interactivo: Hover → tooltip con valores exactos       │
│                                                                │
│  3️⃣  ASIGNACIÓN DE PRESUPUESTO (Donut Chart)                  │
│     ├─ Prospección: 20% → $34,893                             │
│     ├─ Remarketing: 20% → $3,743                              │
│     ├─ Retargeting: 30% → $7,794                              │
│     ├─ Conversiones: 18% → $3,897                             │
│     └─ Otros: 5% → $1,949                                     │
│     [Click en segmento → detalle de campañas en esa categoría]│
│                                                                │
│  4️⃣  TOP CAMPAÑAS (Tabla ordenable)                           │
│     Columnas: Nombre | Gasto | ROAS | CTR | Conv. | CPA | Estado
│     ├─ Fila 1: Prospección-US-Ladi […] | $13,245.62 | 5.64 | …
│     ├─ Fila 2: Remarketing-Targeting […] | $9,732.12 | 3.49 | …
│     ├─ Fila 3: Retargeting-View Cartl […] | $8,654.32 | 3.49 | …
│     └─ [+7 más campañas]                                      │
│     [Clic en fila → detail view de esa campaña]               │
│                                                                │
│  5️⃣  ALERTAS Y ANOMALÍAS (Cards pinned)                       │
│     ├─ 🔴 ROAS bajó 22% en "Prospección-US" (urgencia: alta)  │
│     │   Hora: hace 3h | Recomendación: Pausar o monitorear   │
│     │                                                         │
│     ├─ 🟡 CPC subió 35% en "Conversiones-Proyecto" (media)    │
│     │   Causa probable: Competidor aumentó bids               │
│     │                                                         │
│     └─ 🔵 CTR subió 200% en "Awareness-Test" (info)           │
│         Contexto: Creative nuevo, datos de < 24h              │
│                                                                │
│  6️⃣  INSIGHTS DE IA (Sidebar derecho)                         │
│     ├─ 💡 Oportunidades (escalables):                         │
│     │   "Retargeting-Cali está subutilizado. Escálalo 1.5x"   │
│     │   [Ver detalles]                                        │
│     │                                                         │
│     ├─ 📈 Mejor creativo (performance leader):                │
│     │   "Ad-ID-9832: 80% better CTR than average"             │
│     │   [Duplicate this creative]                             │
│     │                                                         │
│     ├─ ⚠️  Alertas y anomalías (últimas 24h):                 │
│     │   3 anomalías detectadas (ver todas)                    │
│     │                                                         │
│     └─ 🤖 Acciones agénticas sugeridas (pending approval):    │
│         "Pause 2 campaigns" - Confidence 92% [Approve] [Reject]
│                                                                │
│  7️⃣  CHAT DEL AGENTE (Bottom right - persistent)              │
│     ┌────────────────────────────────────────────────────┐    │
│     │ You: "¿Qué campañas debería pausar?"               │    │
│     │                                                    │    │
│     │ Agent: "Basado en los últimos 7 días, recomiendo  │    │
│     │ pausar 'Prospección-US' (ROAS 22% ↓) y            │    │
│     │ 'Conversiones-Proyectos' (CPC 35% ↑). El impacto  │    │
│     │ será ~$500/día de savings.                         │    │
│     │ ¿Ejecuto ahora?"                                  │    │
│     │                                                    │    │
│     │ [Ejecutar] [Esperar] [Explicar más]               │    │
│     └────────────────────────────────────────────────────┘    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### Características Técnicas del Frontend

- ✅ **Responsive:** Funciona en 320px (mobile) hasta 4K (desktop)
- ✅ **Real-time:** Supabase Realtime → métricas actualizadas cada 15 seg
- ✅ **Customizable:** Usuario arrastra/ordena widgets según preferencia
- ✅ **Exportable:** PDF (reportes), CSV (análisis), Email automático
- ✅ **Dark Theme:** Reduce fatiga visual, mejor para sesiones largas
- ✅ **Accessible:** WCAG 2.1 AA compliance (colores, contraste, teclado)
- ✅ **Multi-tenant:** Cada tenant ve solo sus datos (segregación visual)

---

### CAPA 2: Intelligence Engine — The Brain

**Propósito:** Que el sistema CALCULE predicciones, deteccione anomalías, y aprenda.

**Tecnología:** PostgreSQL (Supabase) + Python/Node.js (batch + realtime) + scikit-learn/TensorFlow + Claude API

#### Componentes

**A) Data Ingestion Pipeline**

```
┌─────────────────────┐
│  Meta Ads API v20+  │
│  (campañas, métricas)
│  Frecuencia: 15 min │
└──────────┬──────────┘
           │
           ├─────────────────────────────┐
           │                             │
┌──────────▼──────────┐    ┌─────────────▼──────────┐
│  First-Party Pixel  │    │ CRM + eCommerce       │
│  (conversiones)     │    │ (Shopify/WooCommerce) │
│  Frecuencia: real   │    │ (orders, LTV)         │
└──────────┬──────────┘    └─────────────┬──────────┘
           │                             │
           └─────────────────────────────┘
                       │
                    [NORMALIZATION]
                       │
                       ▼
         ┌─────────────────────────────┐
         │   UNIFIED DATA LAKE         │
         │   (PostgreSQL, Supabase)    │
         │                             │
         │ Tables:                     │
         │ ├─ campaigns               │
         │ ├─ adsets                  │
         │ ├─ ads                     │
         │ ├─ daily_metrics           │
         │ ├─ conversions             │
         │ ├─ creatives               │
         │ ├─ user_actions (audit)    │
         │ └─ tenant_config           │
         │                             │
         │ Almacenamiento:            │
         │ ├─ Hot: últimos 90 días   │
         │ └─ Cold: histórico         │
         └─────────────────────────────┘
```

**B) Feature Engineering**

A partir de datos crudos, el sistema genera **500+ features** para entrenar modelos:

```
Raw Data → Features

ROAS_last_7_days = avg(revenue) / avg(spend)
ROAS_trend = (ROAS_day7 - ROAS_day1) / ROAS_day1
Frequency_decay = frequency_today / frequency_7days_ago
CTR_zscore = (CTR_today - CTR_avg) / stdev(CTR)
Budget_efficiency = revenue_per_dollar_spent
Audience_health = lookalike_performance_vs_baseline
Creative_fatigue = CTR_decline_rate
Competitive_pressure = bid_index vs historical baseline
Seasonal_factor = day_of_week_effect + month_of_year_effect
Payment_method_affinity = conversion_rate by payment type (Colombia specific)
...+ 490 features más
```

**C) ML Model Zoo** (6-8 modelos especializados)

Cada modelo entrenado en 100K+ campañas LATAM (ventaja regional):

| Modelo | Entrada | Salida | Caso de uso |
|---|---|---|---|
| **Predictive ROAS** | Spend, audience, creative, day | ROAS (7-day forecast) | "¿Cuál será mi ROAS en 7 días?" |
| **Anomaly Detector** | All metrics + historical patterns | Anomaly score (0-100) + type | "¿Hay algo raro esta semana?" |
| **Attribution Model** | Meta Pixel + CRM + Analytics | % contribution per channel | "Qué channel realmente trajo la venta?" |
| **Creative Fatigue** | Frequency, CTR, reach decay | Days until burnout + severity | "¿Cuándo pausar este creativo?" |
| **Creative Scorer** | Visual features + text + audio | Quality score (0-100) | "¿Qué tan bueno es este anuncio?" |
| **Audience Health** | LTV, ROI, reach, frequency | Health score per segment | "¿Cuál audience es más valiosa?" |
| **Budget Optimizer** | All metrics + constraints | Optimal allocation % per type | "¿Cómo distribuir presupuesto?" |
| **Competitive Predictor** | Bid index, share-of-voice, benchmarks | Market dynamics score | "¿Se viene presión competitiva?" |

**D) Feature Store & Model Registry**

Gestión centralizada:

```
├─ Feature Store (características pre-computadas)
│  ├─ campaign_metrics (daily snapshots)
│  ├─ creative_performance (hourly updates)
│  └─ audience_dynamics (weekly aggregations)
│
├─ Model Registry (versionamiento de modelos)
│  ├─ predictive_roas_v2.3 (prod) — accuracy 94.2%
│  ├─ predictive_roas_v2.2 (staging) — accuracy 93.8%
│  └─ predictive_roas_v2.1 (archive)
│
└─ Serving Layer (inference en tiempo real)
   ├─ Predictions computed every 15 min
   └─ Cached in Redis for latency < 200ms
```

---

### CAPA 3: Autonomous Agent — The Decision Maker

**Propósito:** Que el sistema DECIDE y EJECUTE sin intervención humana constante.

**Tecnología:** Claude API (Anthropic) + tool_use + system prompts + memory context

#### Flujo de Decisión del Agente

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 1: MONITOREO CONTINUO (24/7 Background)               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Cada 15 minutos, el agente:                                │
│  ├─ Consulta Capa 2: ¿Hay anomalías nuevas?                │
│  ├─ Compara métricas vs baselines (históricas)             │
│  ├─ Calcula anomaly scores para todas las campañas         │
│  └─ Si anomaly_score > 70: → PHASE 2                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  PHASE 2: ANÁLISIS CAUSAL (Root Cause)                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Cuando detecta anomalía, el agente pregunta:               │
│                                                              │
│  "ROAS bajó 25% en 4 horas. ¿Por qué?"                      │
│                                                              │
│  Causas posibles que investiga:                             │
│  ├─ ¿Competidor lanzó anuncio? (competitive intelligence)  │
│  ├─ ¿Audience fatigued? (frequency patterns + decay)        │
│  ├─ ¿Creative changed? (ad library tracking)                │
│  ├─ ¿Budget increased suddenly? (correlation analysis)      │
│  ├─ ¿Seasonalidad o día especial? (calendar data)           │
│  ├─ ¿Technical lag (Meta API latency)? (timestamp checks)   │
│  └─ Resultado: Causa asignada con confidence score          │
│                                                              │
│  Ejemplo: "Causa: Audience fatigue (confidence 87%)"        │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  PHASE 3: GENERACIÓN DE OPCIONES (Multi-option)              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  El agente genera 2-3 opciones ordenadas por confidence:    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ OPCIÓN 1: Pause + Reallocate                        │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ Confidence: 92%                                     │    │
│  │ Acción: Pausa campañas X, Y, Z                      │    │
│  │ Reallocate: $ a campaña W (que está bien)          │    │
│  │ Impacto esperado:                                   │    │
│  │  ├─ Ahorro inmediato: $500/día                      │    │
│  │  ├─ ROAS improvement: +15% esperado                 │    │
│  │  └─ Riesgo: Bajo (probado en 10K campaigns similar)│    │
│  │ Reversible: Sí, en 1-click                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ OPCIÓN 2: Scale Budget (Aggressive)                 │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ Confidence: 78%                                     │    │
│  │ Acción: Aumenta presupuesto diario 2x               │    │
│  │ Impacto esperado:                                   │    │
│  │  ├─ Revenue: +100%                                  │    │
│  │  ├─ ROAS: Unknown (podría caer)                     │    │
│  │  └─ Riesgo: Medio (menos data histórica)            │    │
│  │ Reversible: Sí                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ OPCIÓN 3: Monitor + No Action (Conservative)        │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ Confidence: 85%                                     │    │
│  │ Acción: Espera 12h más para claridad                │    │
│  │ Impacto esperado:                                   │    │
│  │  ├─ Pérdida: Posible otro día de ROAS bajo          │    │
│  │  ├─ Pero: Más información antes de decidir          │    │
│  │  └─ Riesgo: Bajo (prudente)                         │    │
│  │ Reversible: N/A                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  PHASE 4: SOLICITUD DE APROBACIÓN (Human-in-the-loop)        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Lógica de aprobación:                                      │
│                                                              │
│  if (action_financial_impact < $100 USD) {                 │
│      // Ejecuta automático, notifica post-acción           │
│      EXECUTE_NOW()                                         │
│      NOTIFY_USER("Pausé X, ahorré $150 hoy")               │
│  } else if (action_financial_impact >= $100 USD) {         │
│      // Espera aprobación explícita                        │
│      SEND_APPROVAL_REQUEST(user, options)                  │
│      user clicks "Ejecutar" or "Esperar"                   │
│      if (user.approves) EXECUTE_NOW()                      │
│  }                                                          │
│                                                              │
│  Notificación que recibe el usuario:                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 🤖 Agente: Recomendación necesita tu aprobación   │    │
│  │                                                    │    │
│  │ Anomalía: ROAS bajó 25% en Prospección-US          │    │
│  │ Causa: Audience fatigue (87% confidence)           │    │
│  │ Acción: Pausar campaña (impact: -$250 daily spend) │    │
│  │                                                    │    │
│  │ [EJECUTAR AHORA] [ESPERAR] [VER ANÁLISIS]          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  PHASE 5: EJECUCIÓN (API Call a Meta)                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Una vez aprobado, el agente llama Meta Marketing API:      │
│                                                              │
│  // Pausa campaña                                           │
│  POST /v20.0/123456789/campaigns                            │
│  {                                                          │
│    "status": "PAUSED"                                       │
│  }                                                          │
│                                                              │
│  // Aumenta presupuesto de adset                            │
│  POST /v20.0/987654321/adsets                               │
│  {                                                          │
│    "daily_budget": 350000  // $3.50 USD                     │
│  }                                                          │
│                                                              │
│  // Ajusta bid                                              │
│  POST /v20.0/555555555/ads                                  │
│  {                                                          │
│    "bid_amount": 250,  // $2.50 USD                         │
│    "bid_type": "CPC"                                        │
│  }                                                          │
│                                                              │
│  Características:                                           │
│  ├─ Latencia: < 2 segundos (retry logic si falla)          │
│  ├─ Idempotencia: Si falla, reinenta 3 veces              │
│  ├─ Logging: Cada request loguado con timestamp            │
│  └─ Rollback: User puede revertir en 1-click               │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  PHASE 6: LOGGING + EXPLICABILIDAD                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Cada acción registrada en audit log:                       │
│                                                              │
│  Timestamp: 2026-05-24 14:32:15 UTC                         │
│  Tenant: org_12345                                          │
│  User approval: john@company.com                            │
│  Action: CAMPAIGN_PAUSE                                     │
│  Campaign: "Prospección-US" (id: cam_999)                   │
│  Reason: Audience fatigue                                   │
│  Confidence: 87%                                            │
│  Expected impact: -$250 daily spend, +15% ROAS             │
│  Status: EXECUTED                                           │
│  API response: SUCCESS                                      │
│  Explanation:                                               │
│    "He pausado Prospección-US porque detecté fatiga de      │
│     audiencia: frequency bajó 5%, pero CTR cayó 30% en      │
│     4 horas. Basado en 10K experiments similar en           │
│     región, esta pausa ahorra ~$250/día. Puedo             │
│     revertirlo en 1-click si quieres."                      │
│                                                              │
│  ┌─ Reversible: [UNDO] button (cancel within 24h)           │
│  └─ Audit trail: Visible para compliance/debugging          │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  PHASE 7: VALIDACIÓN + FEEDBACK LOOP (48h después)           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  El agente monitorea el resultado:                          │
│                                                              │
│  Acción: Pausé Prospección-US a las 14:32 del 24/May        │
│  Fecha actual: 26/May 14:32 (48 horas después)              │
│                                                              │
│  Métricas antes: ROAS = 4.0, Spend = $500/day              │
│  Métricas después: ROAS = 4.3, Spend = $250/day            │
│  Resultado: ✅ MEJORÓ (ROAS +7.5%, ahorro confirmed)        │
│                                                              │
│  Feedback al modelo:                                        │
│  "Esta decisión fue correcta. Incrementar confianza en      │
│   'audience fatigue' → 'pause' en futuras campañas          │
│   similares de 87% a 91%"                                   │
│                                                              │
│  Efecto: Próxima vez que vea fatiga similar, el agente     │
│  decidirá con más seguridad (learning loop).                │
│                                                              │
│  Notificación al usuario:                                   │
│  "Actualización: La pausa de 'Prospección-US' fue          │
│   acertada. ROAS mejoró +7.5% vs si hubiera dejado activo.  │
│   Modelo de IA afinado para próximas decisiones."          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Característica Clave: Autonomía Controlada

El agente NO es "autónomo = sin control". Es "autónomo = decisiones propias + auditoría total":

```
VERDADERO:                        FALSO:
├─ Ejecuta < $100 sin ask        ├─ Ejecuta sin logging
├─ Pide aprobación > $100         ├─ Sin historial
├─ Explica cada acción           ├─ Black box
├─ Reversible en 24h             ├─ No se puede deshacer
├─ Audit trail completo          ├─ Sin accountability
└─ Aprende de feedback           └─ Mismo error 2x
```

---

### CAPA 4: Conversational Interface — Ask AI

**Propósito:** Que el usuario INTERACTÚE naturalmente con el agente.

**Tecnología:** Claude API + conversation memory (Supabase) + embeddings

#### Características de la Conversación

```
┌──────────────────────────────────────────────────────┐
│  ASK AI INTERFACE (Bottom right corner)               │
├──────────────────────────────────────────────────────┤
│                                                      │
│  📝 Input: "¿Qué campañas debería escalar?"          │
│                                                      │
│  🤖 Output (2-3 segundos):                           │
│     "Basado en los últimos 7 días de performance:    │
│                                                      │
│      🔥 TOP PERFORMERS:                              │
│      1. Retargeting-Cali: 6.2 ROAS, $2K/día          │
│      2. Lookalike-Paid: 4.8 ROAS, $1.5K/día         │
│      3. Prospección-CDMX: 4.8 ROAS, $3K/día          │
│                                                      │
│      ✅ MI RECOMENDACIÓN:                            │
│      Escala 'Retargeting-Cali' de $2K a $3.5K       │
│      (1.75x aumento).                               │
│      Proyectado: +$1,200 daily revenue               │
│      Confianza: 87%                                  │
│                                                      │
│      ❓ RIESGOS:                                      │
│      • Si audience es muy pequeña, CPM podría subir │
│      • Máximo que recomiendo: $4K/día (para no      │
│        saturar segment)                              │
│                                                      │
│      ⚙️ SIGUIENTES PASOS:                            │
│      [Escala ahora] [Escala menos] [Esperar datos] │
│                                                      │
│     "                                                │
│                                                      │
│  💬 Multi-turn (conversación larga):                 │
│     User: "¿Y si comparo con Prospección-CDMX?"     │
│     Agent: "Prospección-CDMX también está bien...   │
│              pero Retargeting tiene mejor ROI       │
│              porque el customer es warm (ya visitó)."
│                                                      │
│     User: "Muéstrame el historial de decisiones"    │
│     Agent: "[Abre drawer] Últimas 10 acciones:      │
│              1. 2026-05-24 14:32: Pausé X (✓)       │
│              2. 2026-05-24 10:15: Escalé Y (+8%)   │
│              ..."                                    │
│                                                      │
│  🧠 Context-aware:                                  │
│     Agente recuerda:                                │
│     ├─ Tu estrategia ("no gastar > $500/día")       │
│     ├─ Tu risk tolerance ("conservative")           │
│     ├─ Tu brand guidelines                          │
│     └─ Decisiones pasadas (para coherencia)         │
│                                                      │
│  📋 Historial persistente:                          │
│     ├─ Guarda todas las conversaciones por tenant   │
│     ├─ Searchable ("muéstrame cuando hablamos de...")│
│     ├─ Exportable (PDF de insights)                 │
│     └─ Shareable (equipo puede ver conversaciones)  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### Ejemplos de Capacidades Conversacionales

```
EJEMPLO 1: Análisis profundo
User: "¿Por qué bajó ROAS?"
Agent: "[Muestra análisis causal] Bajó porque:
        1. Frequency subió (audience cansada)
        2. Seasonalidad: Viernes > Lunes
        3. Competidor pagó más por audience
        Recomendación: Pausar esta, escalar otra."

EJEMPLO 2: Comparativa
User: "¿Cuál creative funciona mejor?"
Agent: "[Muestra tabla] Ad-001 vs Ad-002:
        Ad-001: CTR 2.5%, CPC $1.20, ROAS 4.5 ✅
        Ad-002: CTR 1.8%, CPC $1.50, ROAS 3.8
        Ganador: Ad-001 por 18% en ROAS
        Siguiente: Duplicate Ad-001 con variations."

EJEMPLO 3: Decisiones con guardrails
User: "Escala presupuesto al máximo"
Agent: "Tu límite es $500/día total, estás en $400.
        Máximo que puedo escalar: +$100.
        ¿Hago eso? O prefieres:
        [Opción A] Escalar +$50 (conservador)
        [Opción B] Reallocar entre campañas
        [Opción C] Esperar + datos"

EJEMPLO 4: Historial + decisiones
User: "¿Qué hiciste la semana pasada?"
Agent: "[Abre drawer] Últimas 7 días:
        May-17: Pausé X (ahorro $700)
        May-18: Escalé Y (+15% ROAS)
        May-20: Realoqué presupuesto (mejor mix)
        May-22: Duplicié winning creative
        Resultado neto: +12% ROAS semana"

EJEMPLO 5: Recomendaciones predictivas
User: "¿Qué esperas para el fin de semana?"
Agent: "Basado en patrones históricos:
        Viernes: CTR +8%, CPC -5%
        Sábado: Traffic +20%, ROAS puede ser +12%
        Domingo: Conversiones -15% (menos buyers online)
        Recomendación: Escala Viernes-Sábado,
        pausa o reduce Domingo."
```

---

## Integración Completa: Cómo Funcionan Juntas las 4 Capas

```
TIMELINE DE UN CICLO COMPLETO DE DIVINADS
═══════════════════════════════════════════════════════════════════

14:00 UTC - MONITOREO AUTOMÁTICO
├─ Capa 2 (Intelligence): Consulta métricas cada 15 min
├─ Calcula anomaly_score para todas las campañas
└─ Detecta: "ROAS bajó 25% en Prospección-US" (score: 89)

14:15 UTC - ANÁLISIS CAUSAL
├─ Capa 3 (Agent): Pregunta "¿Por qué?"
├─ Investiga: competencia, frequency, creative, seasonalidad
└─ Conclusión: "Audience fatigue (confidence 87%)"

14:20 UTC - GENERACIÓN DE OPCIONES
├─ Capa 3 (Agent): Genera 3 opciones
├─ Opción 1: Pausar (confidence 92%, impacto -$250/día)
├─ Opción 2: Escalar (confidence 78%, revenue +100%)
└─ Opción 3: Monitor (confidence 85%, riesgo bajo)

14:22 UTC - SOLICITUD DE APROBACIÓN
├─ Como impacto > $100, pide aprobación
├─ Capa 1 (Frontend): Muestra notificación roja + recomendación
├─ Capa 4 (Chat): "Quiero pausar. ¿Ejecuto?"
└─ User: [CLICK "Ejecutar"]

14:23 UTC - EJECUCIÓN
├─ Capa 3 (Agent): Llama Meta API
├─ POST /v20.0/campaign_id/campaigns {"status": "PAUSED"}
├─ Response: 200 OK ✅
├─ Capa 2 (Intelligence): Registra en audit log
└─ Capa 1 (Frontend): Dashboard actualiza (campaña muestra PAUSED)

14:24 UTC - EXPLICACIÓN
├─ Capa 4 (Chat): "Pausé Prospección-US a las 14:23.
│  Razón: Frequency 5.2 (vs 3.5 promedio) + CTR caída 30%.
│  Impacto esperado: -$250 daily spend, +15% ROAS.
│  Reversible en 1-click si cambias de opinión."
└─ Capa 1 (Frontend): Card verde = "Acción ejecutada"

DESPUÉS DE 48 HORAS (26/May 14:23)
├─ Capa 2 (Intelligence): Valida resultado
├─ Antes: ROAS 4.0, Spend $500/día
├─ Después: ROAS 4.3, Spend $250/día
├─ Resultado: ✅ Mejoró (+7.5% ROAS)
├─ Capa 3 (Agent): Actualiza modelo de IA
│  "Esta decisión fue correcta. Aumentar confianza en
│   'audience fatigue' → 'pause' de 87% a 91%"
├─ Capa 4 (Chat): Notifica al user
│  "Validación: Pausa fue acertada. ROAS mejoró +7.5%.
│   Modelo afinado para próximas campañas similares."
└─ Capa 1 (Frontend): Muestra "Mejora validada" en dashboard
```

---

## Composición Resumida en Tabla

| Capa | Componente | Tecnología | Función | Output |
|---|---|---|---|---|
| **1 — Frontend** | Dashboard + KPIs + Charts + Alerts | Next.js + Tailwind + Recharts | Usuario VE todo | Visual en tiempo real |
| **2 — Intelligence** | Data Lake + ML Models + Feature Eng | PostgreSQL + Python + scikit-learn | Sistema CALCULA | Predicciones + anomalías |
| **3 — Agent** | Claude API + Monitor + Analyzer + Executor | Claude API + tool_use + memory | Sistema DECIDE y EJECUTA | Acciones automáticas |
| **4 — Chat** | Conversational UI + Context + History | Claude API + embeddings | Usuario INTERACTÚA | Respuestas en lenguaje natural |

---

## Flujo de Datos (Arquitectura Visiva)

```
META ADS ─────────┐
PIXEL ────────────┤
CRM ──────────────┤
ANALYTICS ────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │  CAPA 2: INTEL CORE  │
        │  (Data Lake + ML)    │
        │  ├─ Normalización    │
        │  ├─ Features: 500+   │
        │  └─ Models: 6-8      │
        └──────────┬──────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
    ┌────────────────┐   ┌──────────────────┐
    │ CAPA 3: AGENT  │   │ CAPA 1: FRONTEND │
    │ ├─ Monitor     │◄──┤ (Dashboard)      │
    │ ├─ Analyze     │   │ ├─ KPIs          │
    │ ├─ Recommend   │   │ ├─ Charts        │
    │ └─ Execute     │   │ └─ Alerts        │
    └────────┬───────┘   └────────┬─────────┘
             │                    │
             └────────┬───────────┘
                      │
                      ▼
              ┌──────────────────┐
              │ CAPA 4: CHAT UI  │
              │ (Conversational) │
              └──────────────────┘
                      │
                      ▼
                   USER
```

---

## Conclusión: Qué ES DivinADS

**DivinADS es un sistema donde:**

1. ✅ **Tu estrategia vive aquí** (valores, límites, guardrails)
2. ✅ **El agente ejecuta aquí** (monitorea, analiza, decide, actúa 10x/día)
3. ✅ **La inteligencia vive aquí** (datos + modelos IA + aprendizaje)
4. ✅ **La confianza está aquí** (auditoría, explicabilidad, reversibilidad)

**No es:**
- ❌ Un dashboard que miras 1x/día
- ❌ Un asistente que solo sugiere
- ❌ Un black box sin control
- ❌ Competencia contra tu equipo

**Es:**
- ✅ Tu aliado operacional 24/7
- ✅ El que ejecuta mientras duermes
- ✅ El que mejora cada semana
- ✅ El que tú controlas completamente

---

**Documento preparado por:** Andrés Consultor  
**Versión:** 1.0 | **Mayo 2026**
