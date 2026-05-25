# API DivinADS - Documentación REST

## URL Base

- **Desarrollo:** `http://localhost:3001`
- **Producción:** `https://api.divinads.com`

## Autenticación

Todas las rutas protegidas requieren el header:
```
Authorization: Bearer <supabase_jwt_token>
```

## Respuesta Estándar

```json
{
  "exito": true,
  "datos": { ... },
  "meta": {
    "pagina": 1,
    "porPagina": 20,
    "total": 142
  }
}
```

## Endpoints

### Campaña

- `GET /api/campañas` — Listar campañas del tenant
- `POST /api/campañas` — Vincular campaña de Meta a DivinADS
- `GET /api/campañas/:id` — Detalle de campaña + métricas recientes
- `PATCH /api/campañas/:id` — Actualizar metadata local

### Métricas

- `GET /api/metricas` — KPIs agregados (Gasto, ROAS, CTR, CPC, etc.)
- `GET /api/metricas/diarias` — Snapshots diarios (últimos 30 días)
- `GET /api/metricas/campaña/:id` — Métricas por campaña específica

### Agente

- `GET /api/agente/acciones` — Registro de auditoría
- `POST /api/agente/aprobar-accion` — Aprobar acción recomendada
- `POST /api/agente/deshacer-accion` — Revertir acción ejecutada (< 24h)
- `GET /api/agente/historial` — Línea de tiempo de decisiones

### Chat

- `POST /api/chat/mensaje` — Enviar mensaje, obtener respuesta del agente
- `GET /api/chat/historial` — Historial completo de conversación
- `POST /api/chat/buscar` — Búsqueda semántica de conversaciones pasadas

### Webhooks

- `POST /api/webhooks/stripe` — Eventos de suscripción
- `GET /health` — Verificación de estado del servidor
