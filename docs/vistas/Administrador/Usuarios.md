# Usuarios

## Ruta y acceso
- Ruta: `/admin/usuarios`
- Rol requerido: `ADMIN`
- Proteccion: `ProtectedRoute` por rol.

## Archivos involucrados
- `src/pages/Administrador/Usuarios/Usuarios.tsx`
- `src/pages/Administrador/Usuarios/Usuarios.css`
- `src/services/admin/users.ts`
- `src/hooks/useUsers.ts`

## Endpoints usados
- `GET /api/v1/users?page=<int>&page_size=<int>`
- `POST /api/v1/users`
- `GET /api/v1/users/{user_id}`
- `PUT /api/v1/users/{user_id}`
- `DELETE /api/v1/users/{user_id}`

## Integracion tecnica
- Todas las llamadas usan `httpClient` central (`apiGet`, `apiPost`, `apiPut`, `apiDelete`).
- Autorizacion: `Authorization: Bearer <token>` desde session storage (via `httpClient`).
- `401`: se intenta refresh una vez por `httpClient`; si falla, se aplica logout y redireccion a login.

## Parametros y payloads
### Listado
- Query params:
  - `page`: pagina actual
  - `page_size`: tamano de pagina

### Crear usuario (POST)
- Body:
  - `username`, `email`, `password`, `user_type`
  - opcionales: `full_name`, `professional_card_number`, `roles`, `is_active`

### Actualizar usuario (PUT)
- Body parcial:
  - `email`, `password`, `full_name`, `user_type`, `professional_card_number`, `roles`, `is_active`

## Flujo UI
1. Al entrar a la vista se carga `GET /users`.
2. Boton `Crear nuevo usuario` abre modal y envia `POST /users`.
3. Boton `Ver/Editar` abre modal con `GET /users/{id}` y guarda con `PUT /users/{id}`.
4. Boton `Desactivar` abre confirmacion y ejecuta `DELETE /users/{id}`.
5. Al exito en crear/editar/desactivar se refresca el listado.
6. Filtros de `Estado`, `Rol` y busqueda por `ID/username` se aplican sobre el listado visible.

## Estados de la vista
- `loading`: skeleton de tabla.
- `error`: banner de error + boton `Reintentar`.
- `empty`: estado vacio con CTA `Crear nuevo usuario`.
- `success`: feedback discreto tras operaciones exitosas.

## Filtros y busqueda
- `Estado`: filtra por activos/inactivos.
- `Rol`: filtra por Administrador, Psicologo o Padre/Tutor.
- `Busqueda`: usa `ID` o `username`.
- `Limpiar`: reinicia estado, rol y busqueda.
- La paginacion deshabilita avance cuando no hay mas registros disponibles.

## Validaciones en frontend
- `user_type` permitido:
  - crear: `guardian | psychologist`
  - editar: `guardian | psychologist`
- `full_name` requerido si `user_type = psychologist`.
- `professional_card_number` requerido si `user_type = psychologist`.
- `password` requerido solo en creacion.
- `username` en editar se muestra `readOnly`.

## Mapeo de errores por status
- `400`: Solicitud invalida. Revisa los datos e intenta de nuevo.
- `401`: Sesion expirada o no autenticado. Inicia sesion nuevamente.
- `403`: No tienes permisos para realizar esta accion.
- `404`: Usuario no encontrado.
- `409`: Conflicto: ya existe un usuario con esos datos (usuario/correo).
- `500`: Error del servidor. Intenta mas tarde.
- Otro: Ocurrio un error inesperado.

## Ajustes visuales actuales
- Se retiro el icono del titulo de la vista para mantener cabecera limpia.
- Se elimino el boton `Exportar` porque no tiene accion implementada.
- El boton principal ahora usa texto completo `Crear nuevo usuario`.
- La tabla incluye columna `ID`.
- El selector de tamano de pagina se muestra como `Tamaño`.
- Se retiro el boton de `Ver` (ojo) para evitar duplicidad con `Editar`.
- Los botones de accion muestran tooltip: `Editar usuario` y `Desactivar usuario`.
- En la columna `ID`, al pasar el mouse se habilita boton para copiar al portapapeles con tooltip.
- El boton de copiar ID aparece a la izquierda del identificador al hacer hover.
- Se corrigio el estado visual para que el ID vuelva a su posicion normal al salir del hover.
- Se mejoro el control de paginacion: flechas mas grandes y alineadas con el texto de pagina.

## Decisiones funcionales recientes
- Se eliminaron referencias a `teacher/docente` del modulo.
- La creacion de admins se resuelve por `roles: ['ADMIN']`, sin asumir `user_type = admin`.
- El formulario mantiene `Tipo` y `Rol`, pero no abre un modulo general de gestion de roles.
- El reset de contraseña admin sigue disponible mediante el campo opcional `Nueva contrasena` en editar usuario.

## Limitaciones actuales
- No se conecto reset de MFA por admin porque en este workspace no existe una ruta verificada ni especificacion local del contrato para esa accion.

## Select global reutilizable
- Se utiliza el componente global `CustomSelect` con el mismo estilo visual de Soporte (selector de tipo de problema).
- Archivos:
  - `src/components/CustomSelect/CustomSelect.tsx`
  - `src/components/CustomSelect/CustomSelect.css`
- Este selector se aplica en filtros, modales y selector de tamaño de pagina.
- El menu desplegable abre en flujo de documento para evitar cortes de fondo al hacer scroll en vistas admin.
