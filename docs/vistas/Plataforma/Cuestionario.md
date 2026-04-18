# Vista: Cuestionario (Usuario)

## Objetivo funcional
- Ejecutar el flujo de cuestionario de usuario sobre `QuestionnaireV2` con sesion real.

## Archivos tocados
- `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`
- `src/services/questionnaires/questionnaires.api.ts`
- `src/services/questionnaires/questionnaires.types.ts`

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
- Seleccion explicita de modo antes de iniciar: `short | medium | full`.
- Modo por defecto: `full`.
- El modo seleccionado se propaga a `active` y a `sessions`.
- Carga de preguntas por pagina con consolidacion de toda la sesion para evitar perdida de preguntas cuando hay varias paginas.
- Persistencia real de respuestas antes de avanzar/finalizar.
- Envio final real con `submit` (sin exito local simulado).

## Pruebas manuales
1. Abrir `/padre/cuestionario` o `/psicologo/cuestionario`.
2. Cambiar modo (`short`, `medium`, `full`) y confirmar en red que cambia `mode` en `active` y en `sessions`.
3. Iniciar sesion de cuestionario y responder preguntas.
4. Verificar llamadas a `sessions`, `sessions/{id}/page`, `answers` y `submit`.
5. Confirmar mensaje de envio exitoso al finalizar.
