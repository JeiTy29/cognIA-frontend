# Usuarios (Admin)

## Objetivo funcional
- Mantener la gestión admin de usuarios sin depender de endpoints legacy `v1`.

## Archivos tocados
- `src/services/admin/users.ts`
- `src/hooks/useUsers.ts`
- `src/pages/Administrador/Usuarios/Usuarios.tsx`

## Endpoints activos utilizados
- `GET /api/admin/users`
- `PATCH /api/admin/users/{id}`
- `POST /api/admin/users/{id}/password-reset`
- `POST /api/admin/users/{id}/mfa/reset`

## Endpoints legacy retirados
- `POST /api/v1/users`
- `GET /api/v1/users/{id}`
- `DELETE /api/v1/users/{id}`

## Decisiones de implementación
- Se retiró el flujo de creación de usuario porque no tiene reemplazo activo en el módulo válido para esta tarea.
- Se retiró la carga de detalle por ID; edición se basa en datos de fila.
- La desactivación ahora usa `PATCH /api/admin/users/{id}` con `is_active=false`.
- Se mantuvieron reset de contraseña y reset MFA.

## Pruebas manuales
1. Abrir `/admin/usuarios` y verificar listado.
2. Editar usuario y confirmar `PATCH /api/admin/users/{id}`.
3. Desactivar usuario y confirmar `PATCH /api/admin/users/{id}` con `is_active=false`.
4. Ejecutar reset de contraseña y reset MFA desde la fila.
