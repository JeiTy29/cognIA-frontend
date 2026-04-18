# Vista: Cuestionario (Usuario)

## Objetivo funcional
- Ejecutar el flujo de cuestionario de usuario sobre `QuestionnaireV2` con sesión real.

## Archivos tocados
- `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`
- `src/services/questionnaires/questionnaires.api.ts`
- `src/services/questionnaires/questionnaires.types.ts`
- `src/services/api/httpClient.ts`

## Endpoints activos usados
- `GET /api/v2/questionnaires/active`
- `POST /api/v2/questionnaires/sessions`
- `GET /api/v2/questionnaires/sessions/{session_id}`
- `GET /api/v2/questionnaires/sessions/{session_id}/page`
- `PATCH /api/v2/questionnaires/sessions/{session_id}/answers`
- `POST /api/v2/questionnaires/sessions/{session_id}/submit`

## Endpoint legacy retirado
- `GET /api/v1/questionnaires/active`

## Decisiones funcionales
- Mapeo de rol:
  - `padre -> caregiver`
  - `psicologo -> psychologist`
- Modo por defecto: `complete` (implementación tipada para soportar `short/medium/complete`).
- Persistencia real de respuestas antes de avanzar/finalizar.
- Envío final real con `submit` (sin éxito local simulado).

## Pruebas manuales
1. Abrir `/padre/cuestionario` o `/psicologo/cuestionario`.
2. Iniciar sesión de cuestionario y responder preguntas.
3. Verificar llamadas a `sessions`, `answers` y `submit`.
4. Confirmar mensaje de envío exitoso al finalizar.
