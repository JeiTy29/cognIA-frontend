# Vista: Cuestionario (Usuario)

## Ubicacion
- `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`
- `src/pages/Plataforma/Cuestionario/Cuestionario.css`

## Objetivo funcional
- Ejecutar flujo Questionnaire V2: inicio/reanudacion, respuestas, submit y visualizacion de resultado.

## Endpoints consumidos por frontend
- `GET /api/v2/questionnaires/active`
- `GET /api/v2/questionnaires/history` (deteccion de `draft`/`in_progress`)
- `POST /api/v2/questionnaires/sessions`
- `POST /api/v2/questionnaires/sessions/{session_id}/secure` cuando el transporte cifrado esta activo
- `POST /api/v2/questionnaires/sessions/{session_id}/page-secure` cuando el transporte cifrado esta activo
- `PATCH /api/v2/questionnaires/sessions/{session_id}/answers`
- `POST /api/v2/questionnaires/sessions/{session_id}/submit`
- `POST /api/v2/questionnaires/history/{session_id}/results-secure`
- `POST /api/v2/questionnaires/history/{session_id}/clinical-summary`

## Ajustes aplicados (ronda 2026-04-24)

### 1) Presentacion del rol en cuestionario en progreso
- Se mejoro la cabecera del flujo en curso:
  - subtitulo con modalidad.
  - chip visual `Aplicado por: ...` con rol humanizado.
- Ya no se presenta como texto tecnico aislado.

### 2) Estado `Guardando...` en boton de avance
- Se ajusto alineacion en botones de control (`stack-controls`):
  - centrado estable de texto.
  - ancho consistente en estado normal y loading.
- Se evita el corrimiento visual al pasar a `Guardando...`.

### 3) Restricciones para preguntas numericas abiertas
- Se endurecio validacion usando limites por pregunta cuando existen:
  - `response_min`
  - `response_max`
  - `response_step`
- Si no vienen limites, se aplican defaults conservadores en frontend para evitar magnitudes absurdas.
- El input numerico usa min/max/step efectivos y muestra rango esperado al usuario.

### 4) Limpieza de prefijos numericos en opciones
- El render de opcion multiple limpia prefijos tipo codigo interno:
  - `0 - texto`
  - `1: texto`
  - `2) texto`
- La limpieza es solo visual.
- El valor enviado al backend no se altera.

## Ajustes de seguridad y resultado final (ronda 2026-05-03)

- Las operaciones sensibles del flujo V2 usan transporte cifrado cuando el backend lo requiere:
  - creacion de sesion,
  - guardado de respuestas,
  - submit,
  - lectura segura de sesion/pagina,
  - resultados finales.
- La pantalla final deja de depender del endpoint legacy plaintext de resultados y usa:
  - `results-secure`
  - `clinical-summary`
- El informe final renderiza seis secciones fijas:
  - sintesis general
  - niveles de compatibilidad
  - indicadores principales observados
  - impacto funcional
  - recomendacion profesional
  - aclaracion importante
- El disclaimer de no diagnostico se muestra siempre, incluso si el backend no entrega la seccion completa.
- Si el backend reporta posible comorbilidad, el frontend la presenta con lenguaje prudente y sin reinterpretacion clinica.

## Nota de contrato
- Reglas exactas de negocio para todos los limites numericos no son verificables solo desde frontend.
- El endurecimiento implementado es defensivo y basado en metadatos disponibles en preguntas.
