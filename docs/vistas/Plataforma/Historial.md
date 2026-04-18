# Vista: Historial (Usuario)

## Objetivo funcional
- Mostrar historial V2 y habilitar acciones de detalle, resultados, etiquetas, share y PDF.

## Archivos tocados
- `src/pages/Plataforma/Historial/HistorialBase.tsx`
- `src/pages/Plataforma/Historial/HistorialBase.css`
- `src/pages/Plataforma/HistorialPadre/HistorialPadre.tsx`
- `src/pages/Plataforma/HistorialPsicologo/HistorialPsicologo.tsx`
- `src/hooks/questionnaires/useQuestionnaireHistoryV2.ts`
- `src/services/questionnaires/questionnaires.api.ts`
- `src/services/questionnaires/questionnaires.types.ts`
- `src/App.tsx`
- `src/pages/Plataforma/CuestionarioCompartido/CuestionarioCompartido.tsx`

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
- `GET /api/v2/questionnaires/shared/{questionnaire_id}/{share_code}`

## Decisiones visuales
- Se mantuvo patrón sobrio con bloque principal + tabla/listado + modal de detalle.
- Sin rediseño global de la plataforma.

## Limitaciones conservadoras
- Algunas respuestas V2 son flexibles; el render de detalle/resultados se implementó de forma defensiva con fallback JSON.
- El enlace compartido se resuelve con campos comunes (`url/share_url/share_code`) sin inventar contrato adicional.

## Pruebas manuales
1. Abrir `/padre/historial` o `/psicologo/historial`.
2. Filtrar por estado y navegar páginas.
3. Abrir detalle y validar carga de resultados.
4. Crear y eliminar tags.
5. Generar share y abrir enlace.
6. Generar/consultar/descargar PDF.
