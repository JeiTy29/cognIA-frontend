# Vista: Cuestionario compartido (publico)

## Objetivo funcional

Mostrar resultados compartidos de cuestionario V2 para consulta externa con lectura comprensible.

## Archivo principal

- `src/pages/Plataforma/CuestionarioCompartido/CuestionarioCompartido.tsx`
- `src/pages/Plataforma/CuestionarioCompartido/CuestionarioCompartido.css`

## Ruta

- `/cuestionario/compartido/:questionnaireId/:shareCode`

## Endpoint consumido por frontend

- `POST /api/v2/questionnaires/shared/access-secure` cuando el transporte cifrado esta activo
- `GET /api/v2/questionnaires/shared/{questionnaire_id}/{share_code}` como fallback tecnico si el transporte cifrado esta deshabilitado

## Presentacion vigente

- Se prioriza informacion orientativa y legible:
  - estado, modo, rol, fechas relevantes,
  - resumen principal,
  - dominios evaluados,
  - comorbilidad.
- Se traduce lenguaje tecnico comun:
  - dominios,
  - niveles de alerta,
  - bandas de confianza,
  - porcentajes y puntajes.
- IDs y claves internas no se muestran como dato principal.
  - cuando aplica, se muestran en bloque secundario `Referencia interna`.

## Mensajes y advertencia clinica

- La vista muestra una advertencia explicita:
  - resultado orientativo para apoyo de alerta temprana,
  - no diagnostico clinico definitivo.
- Errores de API se muestran con mensajes de usuario.
  - codigos HTTP no se usan como mensaje principal.

## Nota de verificabilidad

- La estructura exacta de payload se infiere desde consumo frontend y tipos locales.
- No es verificable solo con evidencia frontend la variabilidad completa de respuesta en todos los entornos.
