# Vista: Reportes (Admin)

## Proposito

Permitir que administracion consulte, filtre, revise y actualice reportes de problema.

## Ruta y navegacion

- Ruta: `/admin/reportes`
- Sidebar admin: `Reportes`

## Estructura de UI

- Encabezado con titulo `Reportes`.
- Filtros:
  - busqueda libre `q`
  - estado
  - tipo
  - rol del reportante
  - fecha desde
  - fecha hasta
  - orden
- Tabla principal:
  - codigo
  - tipo
  - estado
  - reportante
  - modulo de origen (normalizado)
  - fecha
  - acciones
- Modal de detalle:
  - lectura contextual del reporte
  - actualizacion de `status` y `admin_notes`

## Endpoints usados

- `GET /api/admin/problem-reports`
- `GET /api/admin/problem-reports/{report_id}`
- `PATCH /api/admin/problem-reports/{report_id}`

## Ajustes de presentacion (ronda 2026-04-27)

- `source_module` se presenta con etiqueta legible (no cruda).
- `source_path` se presenta como `Pantalla o ruta de origen`.
- MIME de adjuntos se traduce a formato natural:
  - `Imagen PNG`, `Imagen JPEG`, `Imagen WebP`.
- Tamano de adjuntos se muestra con formato legible (B/KB/MB).
- Si `metadata` llega en detalle, se renderiza con filas seguras y etiquetas naturales (sin volcar JSON crudo).

## Mapeos a espanol usados

- Tipo:
  - `bug` -> `Error`
  - `ui_issue` -> `Interfaz`
  - `data_issue` -> `Datos`
  - `performance` -> `Rendimiento`
  - `questionnaire` -> `Cuestionario`
  - `model_result` -> `Resultado del modelo`
  - `other` -> `Otro`
- Estado:
  - `open` -> `Abierto`
  - `triaged` -> `Triagado`
  - `in_progress` -> `En progreso`
  - `resolved` -> `Resuelto`
  - `rejected` -> `Rechazado`
- Rol reportante:
  - `ADMIN` -> `Administrador`
  - `PSYCHOLOGIST` -> `Psicologo`
  - `GUARDIAN` -> `Padre/Tutor`

## Limitaciones conservadoras

- No se implementa descarga de adjuntos porque no se evidencia endpoint de descarga en el consumo frontend actual.
- Si llega un valor no mapeado (tipo, estado, modulo), la UI lo muestra sin romper flujo.

## Archivos relacionados

- `src/pages/Administrador/Reportes/Reportes.tsx`
- `src/pages/Administrador/Reportes/Reportes.css`
- `src/hooks/useAdminProblemReports.ts`
- `src/services/problemReports/problemReports.api.ts`
- `src/services/problemReports/problemReports.types.ts`
