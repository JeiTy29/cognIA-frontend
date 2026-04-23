# Auditoría (Admin)

## Objetivo funcional
- Consultar eventos de auditoría en `/admin/auditoria` con lectura operativa y trazabilidad.

## Archivos principales
- `src/pages/Administrador/Auditoria/Auditoria.tsx`
- `src/pages/Administrador/Auditoria/Auditoria.css`
- `src/hooks/useAuditLogs.ts`
- `src/services/admin/audit.ts`

## Endpoint consumido
- `GET /api/admin/audit-logs`

## Comportamiento visible en UI
- Búsqueda por acción, actor, objetivo, resumen o ID.
- Filtro de acción con etiquetas legibles.
- Orden por fecha (asc/desc).
- Paginación con etiqueta estandarizada `Tamaño`.
- Modal de detalle por evento.

## Normalización del detalle (estado vigente)
- El modal prioriza información entendible:
  - acción (humanizada),
  - actor,
  - objetivo,
  - resumen,
  - fecha y sección.
- Los campos adicionales del payload se muestran con etiquetas naturales cuando es posible.
- Los datos técnicos completos siguen disponibles en un bloque secundario desplegable (`Ver datos técnicos completos`), para no perder trazabilidad.

## Validación manual sugerida
1. Abrir `/admin/auditoria`.
2. Abrir un evento en `Detalle`.
3. Confirmar lectura principal en lenguaje natural.
4. Confirmar que el bloque técnico completo sigue accesible en el desplegable.
