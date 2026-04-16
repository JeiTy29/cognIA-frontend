# Usuarios

## Objetivo
- Completar las acciones admin pendientes sin redisenar la vista.

## Archivos modificados
- `src/pages/Administrador/Usuarios/Usuarios.tsx`
- `src/pages/Administrador/Usuarios/Usuarios.css`
- `src/hooks/useUsers.ts`
- `src/services/admin/users.ts`
- `src/components/CustomSelect/CustomSelect.tsx`
- `src/components/CustomSelect/CustomSelect.css`

## Endpoints usados
- `GET /api/v1/users?page=<int>&page_size=<int>`
- `POST /api/v1/users`
- `GET /api/v1/users/{user_id}`
- `PUT /api/v1/users/{user_id}`
- `DELETE /api/v1/users/{user_id}`
- `POST /api/admin/users/{id}/password-reset`
- `POST /api/admin/users/{id}/mfa/reset`

## Cambios
- Se agregaron dos acciones nuevas por fila:
  - `Restablecer contrasena`
  - `Resetear MFA`
- Ambas acciones usan modal simple de confirmacion.
- Se mantuvieron las acciones existentes:
  - editar
  - desactivar
- La columna de acciones se ensancho solo lo necesario para soportar las cuatro acciones.

## Select compartido
- Se corrigio `CustomSelect` porque el menu desplegable estaba empujando el layout.
- Alcance del cambio:
  - el menu ahora se superpone sobre la UI
  - no mueve el contenido inferior
  - mantiene el estilo visual existente
  - agrega scroll interno cuando hay muchas opciones

## Restricciones visuales respetadas
- No se cambio la estructura general del modulo.
- No se agregaron cards.
- No se creo un menu de acciones nuevo ni un patron visual diferente.

## Limitaciones
- `POST /api/admin/users/{id}/password-reset` devuelve `msg` y `email_sent`, pero la UI usa un mensaje corto en espanol y no muestra payload tecnico.
- `POST /api/admin/users/{id}/mfa/reset` no expone informacion adicional mas alla del resultado de la accion.

## Pruebas manuales
1. Entrar a `/admin/usuarios`.
2. En una fila, usar `Restablecer contrasena` y confirmar el modal.
3. En una fila, usar `Resetear MFA` y confirmar el modal.
4. Verificar que aparezcan mensajes de exito o error sin romper la tabla.
5. Abrir filtros y confirmar que los dropdowns ya no muevan el layout.
