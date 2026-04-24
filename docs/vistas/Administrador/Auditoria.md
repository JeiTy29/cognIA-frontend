# Auditoria (Admin)

## Objetivo funcional
- Consultar eventos de auditoria en `/admin/auditoria` con lectura operativa.

## Archivos principales
- `src/pages/Administrador/Auditoria/Auditoria.tsx`
- `src/pages/Administrador/Auditoria/Auditoria.css`
- `src/hooks/useAuditLogs.ts`
- `src/services/admin/audit.ts`

## Endpoint consumido
- `GET /api/admin/audit-logs`

## Comportamiento visible en UI
- Busqueda por accion, actor, objetivo, resumen o ID.
- Filtro por accion con etiquetas legibles.
- Orden por fecha (asc/desc).
- Paginacion con etiqueta `Tamaño`.
- Modal de detalle con contenido humanizado.

## Detalle de auditoria (estado vigente)
- El modal prioriza:
  - accion (humanizada),
  - actor,
  - objetivo,
  - resumen,
  - fecha y seccion.
- Se mantienen campos complementarios con etiquetas naturales.
- Ya no existe bloque de datos tecnicos completos, raw payload ni JSON expandible.

## Validacion manual sugerida
1. Abrir `/admin/auditoria`.
2. Abrir un evento en `Detalle`.
3. Confirmar que no hay bloque tecnico adicional.
