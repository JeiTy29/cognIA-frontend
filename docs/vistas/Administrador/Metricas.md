# Metricas

## Proposito
Vista de administrador para revisar el estado del servidor, base de datos y metricas de trafico. Esta pagina se habilita en desarrollo con:

- `VITE_DEV_AUTH_BYPASS=true`
- `import.meta.env.DEV === true`

## Endpoints

- `GET /healthz` (sin auth)
- `GET /readyz` (sin auth)
- `GET /metrics` (auth requerida)

`/metrics` exige:
- `Authorization: Bearer <access_token>`

## Polling y estado

- Polling cada 5s.
- Pausa cuando la pestaña no esta visible (Page Visibility API).
- Buffer de 30 puntos para sparklines (requests_total y latency_ms_avg).
- Backoff exponencial ante errores 5xx: 2s, 4s, 8s (se reinicia al recuperar).
- Las llamadas solo se ejecutan cuando la ruta activa es `/admin/metricas`.
- Al salir de la vista, se detienen timers/reintentos para evitar llamadas en segundo plano.

## Manejo de 401

Si `/metrics` retorna 401:
- Se intenta `refreshAccessToken()`.
- Si el refresh funciona, se reintenta `/metrics` una vez.
- Si falla, se mantiene la sesion activa y se muestra un mensaje: “No estas autorizado para ver las metricas”.
- No se redirige automaticamente a login desde esta vista.


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

- `/metrics` 404 -> mostrar “Métricas deshabilitadas” con botón Recargar.
- Errores 5xx -> banner de error con reintentos automáticos.

## Formato de uptime
- < 60s -> `X s`
- < 3600s -> `Y min`
- >= 3600s -> `HH:MM:SS`
