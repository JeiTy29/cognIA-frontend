# Vista: Mis reportes

## Propósito

Permitir que el usuario autenticado consulte los reportes de problema que ya creó desde la plataforma.

## Rutas

- Padre/Tutor: `/padre/reportes`
- Psicólogo: `/psicologo/reportes`

## Estructura de UI

- Encabezado simple con título `Mis reportes`.
- Filtros superiores:
  - estado
  - tipo
  - orden
- Tabla principal con:
  - código
  - tipo
  - estado
  - fecha
  - adjuntos
  - acciones
- Modal simple para ver detalle del propio reporte.

## Endpoints usados

- `GET /api/problem-reports/mine`

## Contrato modelado

- Query params usados por la vista:
  - `page`
  - `page_size`
  - `status`
  - `issue_type`
  - `sort`
  - `order`
- Respuesta:
  - `items`
  - `pagination.page`
  - `pagination.page_size`
  - `pagination.total`
  - `pagination.pages`

## Decisiones visuales

- Se mantuvo un bloque único de plataforma, sin rediseñar Ayuda ni convertir la vista en dashboard.
- El detalle se resolvió con modal para no abrir una página nueva.

## Limitaciones conservadoras

- No hay edición de reportes desde usuario.
- No se implementó descarga de adjuntos porque no se entregó un endpoint para eso.
- El detalle de usuario usa la serialización del listado; no existe endpoint de detalle de usuario en este alcance.

## Archivos relacionados

- `src/pages/Plataforma/Reportes/Reportes.tsx`
- `src/pages/Plataforma/Reportes/Reportes.css`
- `src/hooks/useMyProblemReports.ts`
- `src/services/problemReports/problemReports.api.ts`
- `src/services/problemReports/problemReports.types.ts`
