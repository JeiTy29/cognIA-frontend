# Auditoria

## Objetivo
- Corregir la usabilidad del modulo sin convertirlo en otra plantilla de metricas.

## Archivos modificados
- `src/pages/Administrador/Auditoria/Auditoria.tsx`
- `src/pages/Administrador/Auditoria/Auditoria.css`
- `src/hooks/useAuditLogs.ts`
- `src/services/admin/audit.ts`
- `src/services/admin/users.ts`
- `src/components/CustomSelect/CustomSelect.tsx`
- `src/components/CustomSelect/CustomSelect.css`

## Endpoints usados
- `GET /api/admin/audit-logs`
- `GET /api/v1/users?page=<int>&page_size=<int>`

## Cambios
- Se limpio la cabecera:
  - sin subtitulo largo
  - sin "ultima actualizacion"
  - sin boton `Actualizar`
- La columna `Fecha` ahora permite alternar orden:
  - mas reciente primero
  - mas antigua primero
- El filtro `Accion` usa etiquetas legibles en espanol.
- El detalle del registro sigue en modal.

## Actor
- El backend documenta `user_id` en auditoria, no nombre de usuario.
- El frontend cruza `user_id` con el listado admin de usuarios para mostrar nombre o username cuando puede.
- Si no encuentra coincidencia, deja:
  - el valor textual ya entregado por auditoria
  - o el `user_id` si no hay mas informacion

## Mapping de acciones
- Mapping exacto verificado por OpenAPI:
  - `USER_CREATED` -> `Usuario creado`
- Como OpenAPI no publica un enum completo de acciones de auditoria, el frontend aplica un fallback por tokens para volver legibles acciones no documentadas.
- Tokens traducidos en el fallback:
  - `register` -> `Registro`
  - `login` -> `Inicio de sesion`
  - `logout` -> `Cierre de sesion`
  - `user` -> `Usuario`
  - `create` / `created` -> `Crear` / `Creado`
  - `update` / `updated` -> `Actualizar` / `Actualizado`
  - `delete` / `deleted` -> `Eliminar` / `Eliminado`
  - `password` -> `Contrasena`
  - `reset` -> `Restablecimiento`
  - `mfa` -> `MFA`
  - `approve` / `approved` -> `Aprobar` / `Aprobado`
  - `reject` / `rejected` -> `Rechazar` / `Rechazado`
  - `psychologist` -> `Psicologo`
  - `questionnaire` -> `Cuestionario`
  - `evaluation` -> `Evaluacion`
  - `session` -> `Sesion`
  - `profile` -> `Perfil`
  - `account` -> `Cuenta`
  - `email` -> `Correo`

## Limitaciones
- La API publica el endpoint y el schema de auditoria, pero no un catalogo cerrado de `action`.
- Por eso el mapping implementado es:
  - exacto para acciones documentadas
  - parcial y generico para acciones nuevas o no documentadas

## Select compartido
- Se toco `CustomSelect` para que el menu del filtro de accion no empuje la tabla y muestre bien listas largas.
- No se redisenaron colores ni trigger.

## Pruebas manuales
1. Entrar a `/admin/auditoria`.
2. Abrir el filtro `Accion` y confirmar que el menu se superpone.
3. Alternar el orden en `Fecha`.
4. Verificar que acciones como `USER_CREATED` se vean en lenguaje natural.
5. Confirmar que actor muestre nombre/username cuando exista cruce con usuarios.
