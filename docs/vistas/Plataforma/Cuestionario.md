# Vista: Cuestionario (Usuario)

## Ubicacion
- Vista principal: `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`
- Estilos: `src/pages/Plataforma/Cuestionario/Cuestionario.css`
- Servicios usados: `src/services/questionnaires/questionnaires.api.ts`
- Tipos usados: `src/services/questionnaires/questionnaires.types.ts`

## Objetivo funcional
Ejecutar el flujo de cuestionario V2 para usuario autenticado (padre o psicologo), incluyendo:
- seleccion de modo,
- inicio de sesion,
- carga y respuesta de preguntas,
- guardado de respuestas,
- submit y procesamiento,
- presentacion de resultado cuando el backend lo entrega.

## Endpoints consumidos por frontend
- `GET /api/v2/questionnaires/active`
- `POST /api/v2/questionnaires/sessions`
- `GET /api/v2/questionnaires/sessions/{session_id}`
- `GET /api/v2/questionnaires/sessions/{session_id}/page`
- `PATCH /api/v2/questionnaires/sessions/{session_id}/answers`
- `POST /api/v2/questionnaires/sessions/{session_id}/submit`

## Estados de carga y UX (actualizado)

### 1. Carga inicial previa al boton "Comenzar"
- Cuando `activeLoading` es `true`, se muestra un estado visual de carga estilizado:
  - bloque centrado,
  - indicador animado (anillos + punto),
  - texto de apoyo:
    - titulo: "Preparando cuestionario"
    - descripcion: "Estamos cargando la sesion y las preguntas iniciales."
- Ya no se usa texto plano aislado tipo "Cargando cuestionario...".

### 2. Error de carga inicial
- Si falla la carga inicial, se muestra mensaje de error con boton "Reintentar".

### 3. Carga/procesamiento luego de submit
- La vista maneja fases:
  - `submitting`
  - `processing`
  - `processed`
  - `failed`
- Mientras procesa, se muestra panel operativo con pasos, estado backend y metadatos de sesion.
- Si llega `processed`, se muestra resultado estructurado (resumen, dominios y comorbilidad cuando existan).

## Notas de implementacion relevantes
- Mapeo de rol frontend a rol API:
  - `padre -> guardian`
  - `psicologo -> psychologist`
- Modo por defecto: `complete`.
- Tamano de pagina de sesion: `page_size=20`.
- El componente consolida preguntas y respuestas en estado local para no perder continuidad de navegacion entre preguntas.

## Alcance de esta documentacion
- Esta ficha describe lo verificable desde el frontend y su consumo de API.
- No confirma reglas internas de evaluacion del backend mas alla de lo observable por respuestas consumidas.
