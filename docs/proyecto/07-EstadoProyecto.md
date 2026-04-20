# Estado actual observado del frontend

## Base de evaluacion

Este estado se construye solo con evidencia del repositorio frontend local.

- No se evalua backend en ejecucion.
- No se afirma disponibilidad real de endpoints fuera del consumo observado en servicios.

## Estado funcional general

El frontend muestra implementacion activa en:

1. Navegacion por roles con rutas protegidas (`padre`, `psicologo`, `admin`).
2. Autenticacion con login, registro, MFA, refresh de sesion y perfil.
3. Cuestionario V2 con flujo de sesion, respuestas, submit, historial, share y PDF.
4. Vista publica compartida para resultados.
5. Panel admin con modulos operativos y analiticos.
6. Modulo de ayuda con reporte de incidencias para usuarios y gestion admin de reportes.

## Calidad tecnica observable

### Evidencia positiva

- Hay scripts de calidad/entrega en `package.json`:
  - `lint`
  - `build`
  - `preview`
- Existe capa HTTP comun con manejo consistente de errores (`ApiError`) y retry de autenticacion via refresh.
- Se usa TypeScript en todo el arbol funcional principal.

### Vacios visibles (sin juicio absoluto)

1. No aparece evidencia clara de pruebas automatizadas frontend.
   - No hay script `test` en `package.json`.
   - No se detectaron archivos `*.test.*` o `*.spec.*` en `src`.
2. Parte de la integracion API depende de normalizadores defensivos con multiples aliases de campo.
   - Esto aumenta resiliencia, pero dificulta trazabilidad contractual unica.
3. La documentacion historica (previa a esta actualizacion) estaba desalineada respecto al estado real de rutas, modulos y auth.

## Riesgos de interpretacion contractual

- El frontend consume endpoints y shapes tipados localmente.
- Sin OpenAPI validado en este repositorio, no es posible confirmar desde frontend:
  - obligatoriedad exacta de todos los campos
  - enums finales de backend
  - cobertura de errores completa por endpoint

Por lo anterior, las descripciones de contrato en docs deben leerse como:

- "consumo real del frontend"
- no como "especificacion backend certificada"

## Prioridades recomendadas de documentacion y calidad

1. Mantener inventario de endpoints consumidos actualizado.
2. Introducir pruebas automatizadas de al menos:
   - rutas protegidas
   - auth refresh
   - flujos criticos de cuestionario
3. Definir fuente unica de contratos (idealmente OpenAPI versionado y sincronizado en cliente).
