# Política de documentación de cambios (frontend)

## Regla obligatoria

Toda acción de implementación debe quedar documentada en el repositorio.

Aplica tanto a:
- cambios funcionales
- cambios de integración API
- cambios de rutas/navegación
- cambios de UX relevantes

## Documentos que deben actualizarse

1. `docs/proyecto/12-RegistroCambiosFrontend.md`
   - entrada nueva por cada implementación relevante.
2. Documentación del módulo afectado en `docs/vistas/**`.
3. Si cambia navegación o alcance global:
   - `docs/proyecto/09-NavegacionFrontendVigente.md`
   - `docs/proyecto/10-ModulosFrontendVigentes.md`
   - `docs/proyecto/05-FlujosUsuarios.md` (si afecta flujos).

## Checklist mínimo por cambio

1. endpoint(s) usados o modificados
2. ruta(s) UI afectadas
3. comportamiento antes/después
4. manejo de errores visible
5. archivos modificados
6. estado de verificación (build/lint/manual)

## Convención de redacción

- Basarse en evidencia del frontend.
- No inventar contrato backend.
- Si algo no puede comprobarse solo desde frontend, indicar:
  - `inferido desde consumo frontend`
  - o `no verificable solo con evidencia frontend`.

## Cumplimiento operativo

Antes de cerrar una tarea, debe existir actualización documental en los archivos anteriores.
