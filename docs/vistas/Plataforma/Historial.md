# Vista: Historial (Usuario)

## Objetivo funcional
- Mostrar historial V2 y habilitar acciones de detalle, etiquetas, compartir y PDF.

## Archivos principales
- `src/pages/Plataforma/Historial/HistorialBase.tsx`
- `src/pages/Plataforma/Historial/HistorialBase.css`
- `src/hooks/questionnaires/useQuestionnaireHistoryV2.ts`
- `src/services/questionnaires/questionnaires.api.ts`
- `src/services/questionnaires/questionnaires.types.ts`

## Endpoints activos usados
- `GET /api/v2/questionnaires/history`
- `GET /api/v2/questionnaires/history/{session_id}`
- `GET /api/v2/questionnaires/history/{session_id}/results`
- `POST /api/v2/questionnaires/history/{session_id}/tags`
- `DELETE /api/v2/questionnaires/history/{session_id}/tags/{tag_id}`
- `POST /api/v2/questionnaires/history/{session_id}/share`
- `POST /api/v2/questionnaires/history/{session_id}/pdf/generate`
- `GET /api/v2/questionnaires/history/{session_id}/pdf`
- `GET /api/v2/questionnaires/history/{session_id}/pdf/download`

## Ajustes UX aplicados (ronda 2026-04-24)
- Se redujo lenguaje tecnico en el detalle:
  - etiquetas mas naturales para campos frecuentes.
  - formato de valores mas legible (fechas/booleanos/estados).
- Se eliminaron controles irrelevantes del bloque compartir:
  - `Permitir tags`
  - `Permitir descarga PDF`
- Se reorganizo el bloque final por flujo:
  - **Compartir resultado** (generar, copiar, abrir, regenerar enlace)
  - **Documento PDF** (generar, consultar estado, descargar)
- Se mantiene funcionalidad de tags/share/pdf sin exponer JSON crudo en esta vista.

## Nota de contrato
- La resolucion de enlace compartido y algunos campos de metadata siguen siendo inferidos desde el consumo frontend.
- No es verificable solo con frontend el contrato definitivo de cada payload de resultados.

## Validacion manual sugerida
1. Abrir `/padre/historial` o `/psicologo/historial`.
2. Abrir detalle de una sesion.
3. Confirmar que no aparecen toggles de permisos para tags/PDF.
4. Confirmar jerarquia de acciones separada entre compartir y PDF.
