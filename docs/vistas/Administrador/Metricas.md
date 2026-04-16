# Metricas

## Proposito
Vista de administrador para revisar el estado del servidor, base de datos y metricas de trafico sin cambiar la UI existente.

## Endpoints

- `GET /healthz` (sin auth)
- `GET /readyz` (sin auth)
- `GET /api/admin/metrics` (auth admin)

## Polling y estado

- Polling cada 5s.
- Pausa cuando la pestaña no esta visible (Page Visibility API).
- Buffer de 30 puntos para sparklines (requests_total y latency_ms_avg).
- Backoff exponencial ante errores 5xx: 2s, 4s, 8s (se reinicia al recuperar).
- Las llamadas solo se ejecutan cuando la ruta activa es `/admin/metricas`.
- Al salir de la vista, se detienen timers/reintentos para evitar llamadas en segundo plano.

## Integracion tecnica

- `GET /api/admin/metrics` usa `httpClient` central via `apiGet`, con refresh automatico si la sesion expiro.
- La vista sigue reutilizando `/healthz` y `/readyz` para los bloques superiores de servidor y base de datos.
- Si la respuesta de `/api/admin/metrics` no trae el snapshot esperado, se muestra error en la vista sin redisenarla.


## Widgets y mapeo

### Estado del servidor
- `/healthz.status = ok` -> badge **OK** (verde) + “Servidor operativo”.
- Error/timeout -> “No disponible” (rojo) + “No se pudo obtener el estado”.

### Estado de base de datos
- `/readyz.status = ready` -> “Base de datos: Lista”.
- `/readyz.status = not_ready` -> “No disponible”.
- `latency_ms` -> “Latencia: X ms” + barra proporcional (referencia 2000ms).

### Snapshot
- `latency_ms_avg`, `latency_ms_max`, `requests_total`, `uptime_seconds`.
- Donut para `status_counts` con porcentajes.
- Texto: “La latencia promedio se mantiene en X ms, con máximo de Y ms en picos.”

### Tabla inferior
- Uptime, solicitudes, latencias y conteos HTTP con separadores.

## Estados especiales

- `/api/admin/metrics` 404 -> mostrar “Métricas deshabilitadas” con botón Recargar.
- Errores 5xx -> banner de error con reintentos automáticos.

## Archivos tocados
- `src/pages/Administrador/Metricas/Metricas.tsx`
- `src/hooks/metrics/useMetrics.ts`
- `src/services/admin/metrics.ts`

## Restricciones visuales respetadas
- No se rediseño la pantalla.
- No se agregaron cards nuevas.
- Se mantuvo la estructura actual de bloques, snapshot y tabla inferior.

## Formato de uptime
- < 60s -> `X s`
- < 3600s -> `Y min`
- >= 3600s -> `HH:MM:SS`
