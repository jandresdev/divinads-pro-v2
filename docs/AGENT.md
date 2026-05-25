# Flujo del Agente Autónomo DivinADS

## Ciclo de Decisión (Cada 15 Minutos)

```
MONITOREO → ANÁLISIS → RECOMENDACIÓN → EJECUCIÓN → VALIDACIÓN → APRENDIZAJE
  (24/7)    (causal)   (multi-opción)  (< 2 seg)   (48h post)   (modelo)
```

## Guardrails (Límites de Autonomía)

- **Auto-ejecuta:** Acciones con impacto financiero < $100 USD
- **Pide aprobación:** Acciones con impacto >= $100 USD
- **Reversible:** Toda acción puede deshacerse en < 24h
- **Auditable:** Cada acción queda registrada con timestamp, causa, confianza, resultado

## Causas de Anomalías que Investiga

1. Fatiga de audiencia (frequency alta, CTR cayendo)
2. Presión competitiva (incremento de bids del mercado)
3. Cambio de creativo (performance nuevo creativo)
4. Estacionalidad (día de la semana, época del año)
5. Lag técnico de Meta API (datos tardíos)
6. Cambio de presupuesto reciente (correlación temporal)
