# Psicologos

## Objetivo
- Mantener la vista sobria y centrada en revision.

## Archivos modificados
- `src/pages/Administrador/Psicologos/Psicologos.tsx`

## Endpoints usados
- `GET /api/v1/users?page=<int>&page_size=<int>`
- `POST /api/admin/psychologists/{id}/approve`
- `POST /api/admin/psychologists/{id}/reject`

## Cambios
- Se retiro el texto explicativo debajo del encabezado.
- Se retiro el boton `Actualizar` de cabecera.
- Se mantuvo la estructura existente:
  - filtros
  - tabla
  - paginacion
  - modal de rechazo

## Restricciones visuales respetadas
- No se agregaron cards.
- No se cambio el layout del modulo.
- No se copio la cabecera de metricas.

## Limitaciones
- La deteccion de psicologos pendientes o rechazados sigue dependiendo de los campos de estado que expone el backend en usuarios.
- Si el backend no expone esos campos, la vista solo puede mostrar el aviso de limitacion.

## Pruebas manuales
1. Entrar a `/admin/psicologos`.
2. Confirmar que el encabezado ya no tenga texto aclarativo extra.
3. Filtrar por `Pendientes` y `Rechazados`.
4. Probar aprobar y rechazar con razon.
