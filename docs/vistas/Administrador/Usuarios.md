# Usuarios

## Objetivo
- Alinear el modulo de usuarios con el contrato backend actual sin redisenar la UI.

## Archivos modificados
- `src/services/api/httpClient.ts`
- `src/services/admin/users.ts`
- `src/hooks/useUsers.ts`
- `src/pages/Administrador/Usuarios/Usuarios.tsx`
- `src/pages/Administrador/Psicologos/Psicologos.tsx`

## Endpoints migrados
- `GET /api/admin/users`
  - reemplaza el listado anterior en `GET /api/v1/users`
- `PATCH /api/admin/users/{id}`
  - reemplaza la actualizacion anterior en `PUT /api/v1/users/{id}`

## Endpoints que se mantienen igual
- `POST /api/v1/users`
  - creacion de usuario
- `GET /api/v1/users/{id}`
  - detalle individual
- `DELETE /api/v1/users/{id}`
  - desactivacion
- `POST /api/admin/users/{id}/password-reset`
  - reset de contrasena por admin
- `POST /api/admin/users/{id}/mfa/reset`
  - reset MFA por admin

## Cambios de contrato
- Listado:
  - antes: respuesta paginada plana
  - ahora: `items` + `pagination`
- Actualizacion:
  - antes: se enviaban campos del formulario completo
  - ahora: solo se envia lo soportado por el contrato admin:
    - `is_active`
    - `roles`
    - `user_type`
    - `professional_card_number`

## Limitaciones
- La edicion mantiene visibles `email` y `full_name`, pero quedan en solo lectura.
- Esos campos no se envian en `PATCH /api/admin/users/{id}` porque no forman parte del contrato recibido para esta tarea.
- `src/pages/Administrador/Psicologos/Psicologos.tsx` solo se ajusto para aceptar `created_at: string | null` y no rompe el build.

## Pruebas manuales
1. Abrir `/admin/usuarios` y verificar que la tabla siga cargando.
2. Crear un usuario y confirmar que sigue usando el flujo anterior.
3. Editar un usuario y confirmar que guarda cambios de `user_type`, `rol`, `is_active` y `professional_card_number`.
4. Verificar en red que el listado use `GET /api/admin/users`.
5. Verificar en red que la edicion use `PATCH /api/admin/users/{id}`.
