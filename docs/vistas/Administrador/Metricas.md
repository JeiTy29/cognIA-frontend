# Metricas

## Objetivo
- Mantener la vista de metricas existente con el menor cambio visual posible.
- Integrar la salud de correo dentro de esta misma vista.

## Archivos modificados
- `src/pages/Administrador/Metricas/Metricas.tsx`
- `src/pages/Administrador/Metricas/Metricas.css`
- `src/hooks/metrics/useMetrics.ts`
- `src/services/admin/emailHealth.ts`
- `src/App.tsx`
- `src/components/Sidebar/SidebarConfig.tsx`

## Endpoints usados
- `GET /healthz`
- `GET /readyz`
- `GET /api/admin/metrics`
- `GET /api/admin/email/health`

## Cambios
- Se retiro ruido visual del encabezado de metricas:
  - sin subtitulo adicional
  - sin "ultima actualizacion"
  - sin boton de actualizar en cabecera
- Se mantuvo la estructura general de bloques superiores, snapshot y tabla inferior.
- El bloque superior de `Uptime` fue reemplazado por `Servicio de correo`.
- `Servicio de correo` muestra:
  - estado
  - color lateral segun estado
  - detalle corto
  - razon si el backend la expone o si la configuracion esta incompleta
- La tabla inferior se ajusto en columnas, separacion y wrap para evitar encabezados pegados o superpuestos.

## Salud de correo
- La vista separada `/admin/correo` dejo de usarse.
- La ruta y la entrada del sidebar se eliminaron.
- La informacion de correo ahora vive solo dentro de `/admin/metricas`.

## Restricciones visuales respetadas
- No se agregaron cards nuevas.
- No se convirtio la vista en dashboard nuevo.
- No se clonaron subtitulos, textos aclarativos ni "ultima actualizacion".

## Limitaciones
- El schema OpenAPI de `GET /api/admin/email/health` solo documenta banderas de configuracion:
  - `email_enabled`
  - `smtp_host_configured`
  - `smtp_user_configured`
  - `smtp_use_tls`
  - `smtp_use_ssl`
- Si el backend no envia `error`, `message`, `detail` o `reason`, la vista muestra una razon derivada de esas banderas.

## Pruebas manuales
1. Entrar a `/admin/metricas`.
2. Verificar que el bloque `Servicio de correo` aparezca junto a servidor y base de datos.
3. Confirmar que la tabla inferior ya no superponga encabezados.
4. Confirmar que ya no exista la ruta visible de correo en el sidebar admin.
