# Vista: Dashboard (Admin)

## Ubicacion

- Vista: `src/pages/Administrador/Dashboard/Dashboard.tsx`
- Estilos: `src/pages/Administrador/Dashboard/Dashboard.css`
- Hook principal: `src/hooks/dashboard/useDashboard.ts`
- Servicios:
  - `src/services/dashboard/*`

## Ruta

- `/admin/dashboard`

## Objetivo funcional

Presentar lectura ejecutiva y operativa del sistema para administradores.

## Mejoras visuales aplicadas

1. Titulos y texto en lenguaje mas natural:
   - `Historico de adopcion` -> `Evolucion del uso de la plataforma`
   - `Drift` -> `Cambios en el comportamiento de los datos`
   - `Equidad` -> `Comparativas entre grupos`
   - `Retencion` -> `Continuidad de uso`
2. Se agrego contexto breve por seccion sin sobrecargar la interfaz.
3. Se mejoro legibilidad de periodos:
   - `YYYY-MM` se muestra como mes + anio en espanol.
4. Se ampliaron labels de campos tecnicos:
   - `count`, `month`, `conversion_created_to_processed`, etc.

## Estado funcional vigente

- La vista de Dashboard no incluye generacion de reportes.
- Se eliminaron CTAs y estado UI de `Generar reporte` / `Reportes adicionales`.
- El foco de la pantalla queda en consumo y visualizacion de bloques analiticos (`/api/v2/dashboard/*`).

## Nota de verificabilidad

La normalizacion se basa en el consumo del frontend sobre la respuesta del endpoint.
Sin backend activo, no se certifica la variabilidad total de payloads fuera de lo soportado en el cliente.
