# Auditoria

## Ruta y acceso
- Ruta: `/admin/auditoria`
- Rol requerido: `ADMIN`

## Archivos involucrados
- `src/pages/Administrador/Auditoria/Auditoria.tsx`
- `src/pages/Administrador/Auditoria/Auditoria.css`
- `src/pages/Administrador/AdminShared.css`
- `src/hooks/useAuditLogs.ts`
- `src/services/admin/audit.ts`

## Endpoint usado
- `GET /api/admin/audit-logs`

## Objetivo funcional
- Separar auditoria del modulo de metricas.
- Exponer registros operativos en una tabla con filtros, paginacion local y detalle por modal.

## Flujo UI
1. La vista carga el endpoint de auditoria.
2. Se normaliza la respuesta para soportar array directo o colecciones tipo `items`, `logs`, `audit_logs`, `results` o `data`.
3. Los filtros funcionan por accion y busqueda libre.
4. El detalle abre un modal con el payload crudo del registro.

## Decisiones visuales
- Se mantuvo el lenguaje visual del admin actual.
- Se uso tabla + filtros + modal.
- No se introdujeron dashboards ni cards nuevas.

## Limitaciones y riesgos
- No hay contrato local de respuesta para auditoria.
- La vista mapea de forma tolerante campos comunes como `action`, `event`, `actor`, `target`, `description`, `message` y `metadata`.
- Si el backend cambia la forma del payload, puede reducirse el detalle visible aunque el JSON siga cargando.

## Pruebas manuales
- Entrar a `/admin/auditoria`.
- Buscar por accion, actor o ID.
- Filtrar por una accion concreta.
- Abrir el modal de detalle y revisar campos del registro.
