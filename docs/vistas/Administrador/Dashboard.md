# Vista: Dashboard (Admin)

## Ubicacion

- Vista: `src/pages/Administrador/Dashboard/Dashboard.tsx`
- Estilos: `src/pages/Administrador/Dashboard/Dashboard.css`
- Hook principal: `src/hooks/dashboard/useDashboard.ts`
- Reportes: `src/hooks/reports/useDashboardReports.ts`
- Servicios:
  - `src/services/dashboard/*`
  - `src/services/reports/*`

## Ruta

- `/admin/dashboard`

## Objetivo funcional

Presentar lectura ejecutiva y operativa del sistema para administradores y permitir generacion contextual de reportes.

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

## Reportes operativos (POST /api/v2/reports/jobs)

La vista ya no depende solo de `dataset.adoption_history`.

- Se normaliza `dataset` en secciones.
- Cada seccion se renderiza por tipo/familia:
  - series
  - resumen de conversion
  - resumen de capacidad operativa
  - bloque estructurado/escalares/listas
- Si el dataset trae informacion util, se muestra en la UI sin fallback tecnico.
- Solo se muestra estado vacio cuando realmente no hay datos representables.

## Tipos de reporte soportados en frontend

- `executive_monthly`
- `adoption_history`
- `model_monitoring`
- `operational_productivity`
- `security_compliance`
- `traceability_audit`

## Nota de verificabilidad

La normalizacion se basa en el consumo del frontend sobre la respuesta del endpoint.
Sin backend activo, no se certifica la variabilidad total de payloads fuera de lo soportado en el cliente.
