# Metricas

## Proposito
Vista de administrador para revisar el estado del servidor, base de datos y metricas de trafico. Esta pagina es solo de desarrollo y se habilita con:

- `VITE_ENABLE_ADMIN=true` en `.env.local`
- `import.meta.env.DEV === true`

## Estructura de la vista

### Encabezado
- Titulo: **Metricas del sistema**
- Subtitulo: “Vision general del estado del servidor, base de datos y metricas de trafico”.
- Boton **Actualizar**: simula recarga de fixtures y refresca valores con una ligera variacion.
- Linea de acento horizontal debajo del encabezado.

### Estados rapidos (fila superior)
Bloques planos con barra de acento a la izquierda:
- **Servidor**: estado OK, texto “Servidor operativo” y microtexto “Sin interrupciones registradas”.
- **Base de datos**: estado “Lista”, latencia en ms y mini barra proporcional a `database.latency_ms`.
- **Uptime + Solicitudes**: uptime formateado y numero total de solicitudes.

### Snapshot de metricas
- Grid con valores grandes:
  - Latencia promedio (`latency_ms_avg`)
  - Latencia maxima (`latency_ms_max`)
  - Solicitudes totales (`requests_total`)
  - Uptime formateado
- Grafico donut para `status_counts` con leyenda y porcentajes.
- Texto interpretativo: “La latencia promedio se mantiene en X ms, con maximo de Y ms en picos.”

### Tabla de detalle
Tabla compacta sin cards:
- Uptime, solicitudes, latencias y conteo de estados HTTP.
- Separadores horizontales finos y un indicador de color por fila.

## Conversion de datos (JSON -> UI)
- `server_status: ok` -> badge “OK” + textos “Servidor operativo”.
- `database.status: ready` -> “Base de datos: Lista”.
- `database.latency_ms` -> “Latencia: X ms” + barra proporcional.
- `snapshot_metrics.uptime_seconds` -> formato legible:
  - < 60: X s
  - < 3600: Y min
  - >= 3600: HH:MM:SS
- `status_counts` -> porcentajes: `valor / total * 100` con 0 decimales.

## Acceso en desarrollo
- Entrada de sidebar y acceso a `/admin/metricas` solo en DEV y con `VITE_ENABLE_ADMIN=true`.
- En produccion no existe la entrada ni la ruta.

## Fixture
Fuente de datos local: `src/pages/Administrador/Metricas/metricas.json`.
