# Vista: Ayuda

## Propósito

Concentrar FAQ, reporte de problemas, mis reportes, contacto y legal en una sola experiencia para padre y psicólogo.

## Cambios relevantes

- Se eliminó la navegación separada de `Mis reportes` para usuario.
- `Mis reportes` ahora vive dentro de `Ayuda`.
- La carga de reportes de usuario pasó a ser diferida: solo se consulta `GET /api/problem-reports/mine` cuando se abre esa sección.
- La vista dejó de usar cards como patrón principal y pasó a secciones verticales con divisores y bloques sobrios.

## Estructura actual

- FAQ en acordeón.
- `Reportar un problema` con formulario colapsable.
- `Mis reportes` con filtros, listado, detalle por modal y paginación.
- `Contacto`.
- `Legal`.

## Endpoints usados

- `POST /api/problem-reports`
- `GET /api/problem-reports/mine`

## Reglas de adjunto

- máximo `5 MB`
- MIME permitidos:
  - `image/png`
  - `image/jpeg`
  - `image/webp`
- Si hay adjunto, el create usa `multipart/form-data`.

## Mapeos a español

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

## Archivos relacionados

- `src/pages/Plataforma/Ayuda/AyudaBase.tsx`
- `src/pages/Plataforma/Ayuda/Ayuda.css`
- `src/hooks/useMyProblemReports.ts`
- `src/services/problemReports/problemReports.api.ts`
- `src/services/problemReports/problemReports.types.ts`
