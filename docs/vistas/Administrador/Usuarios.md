# Usuarios (Admin)

## Objetivo funcional
- Gestionar usuarios administrativos y operativos desde la vista `/admin/usuarios`.

## Archivos principales
- `src/pages/Administrador/Usuarios/Usuarios.tsx`
- `src/pages/Administrador/Usuarios/Usuarios.css`
- `src/hooks/useUsers.ts`
- `src/services/admin/users.ts`

## Endpoints activos utilizados
- `GET /api/admin/users`
- `PATCH /api/admin/users/{id}`
- `POST /api/admin/users/{id}/password-reset`
- `POST /api/admin/users/{id}/mfa/reset`

## Comportamiento visible en UI
- Edicion de usuario por modal.
- Desactivacion por modal de confirmacion (no elimina registros).
- Reset de contraseña y reset MFA desde acciones por fila.
- Copia de ID de usuario desde el boton de portapapeles en la columna de identificador.
- Paginacion con etiqueta estandarizada: `Tamaño`.

## Ajustes visuales recientes
- El boton de copiar ID se ajusto para mejor tamaño y alineacion vertical con el identificador.
- La accion de desactivar usa icono de bloqueo (semantica de desactivacion), en lugar de icono de papelera.
- Se mantiene tooltip y accesibilidad (`aria-label`) alineada a la accion real.

## Validacion manual sugerida
1. Abrir `/admin/usuarios`.
2. Verificar el boton de copiar ID en tamaño/alineacion.
3. Confirmar que el boton de desactivar muestra iconografia de bloqueo.
4. Confirmar que el selector de paginacion muestra `Tamaño`.
