# Vista: Reportes

## Propósito

Permitir que administración consulte, filtre, revise y actualice reportes de problema.

## Ruta y navegación

- Ruta: `/admin/reportes`
- Sidebar admin: `Reportes`

## Estructura de UI

- Encabezado sobrio con título `Reportes`.
- Filtros superiores:
  - búsqueda libre `q`
  - estado
  - tipo
  - rol del reportante
  - fecha desde
  - fecha hasta
  - orden
- Tabla principal con:
  - código
  - tipo
  - estado
  - reportante
  - módulo
  - fecha
  - acciones
- Modal de detalle con actualización de:
  - `status`
  - `admin_notes`

## Endpoints usados

- `GET /api/admin/problem-reports`
- `GET /api/admin/problem-reports/{report_id}`
- `PATCH /api/admin/problem-reports/{report_id}`

## Payloads usados

- Actualización:
  - `status?`
  - `admin_notes?`
- La vista evita enviar un patch vacío.

## Respuesta modelada

- Listado:
  - `items`
  - `pagination.page`
  - `pagination.page_size`
  - `pagination.total`
  - `pagination.pages`
- Detalle y actualización:
  - `report`

## Mapeos a español usados

- Tipo:
  - `bug` → `Error`
  - `ui_issue` → `Interfaz`
  - `data_issue` → `Datos`
  - `performance` → `Rendimiento`
  - `questionnaire` → `Cuestionario`
  - `model_result` → `Resultado del modelo`
  - `other` → `Otro`
- Estado:
  - `open` → `Abierto`
  - `triaged` → `Triagado`
  - `in_progress` → `En progreso`
  - `resolved` → `Resuelto`
  - `rejected` → `Rechazado`
- Rol reportante:
  - `ADMIN` → `Administrador`
  - `PSYCHOLOGIST` → `Psicólogo`
  - `GUARDIAN` → `Padre/Tutor`

## Decisiones visuales

- Se reutilizó el patrón admin actual de filtros + tabla + modal.
- No se agregaron cards nuevas ni subtítulos explicativos innecesarios.

## Limitaciones conservadoras

- No se implementó descarga de adjuntos porque no se entregó un endpoint para eso.
- Si llega un valor no mapeado en tipo, estado o rol, la UI lo muestra sin romperse.

## Archivos relacionados

- `src/pages/Administrador/Reportes/Reportes.tsx`
- `src/pages/Administrador/Reportes/Reportes.css`
- `src/hooks/useAdminProblemReports.ts`
- `src/services/problemReports/problemReports.api.ts`
- `src/services/problemReports/problemReports.types.ts`
