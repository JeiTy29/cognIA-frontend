# Vista: Mi cuenta

## Propósito

Centralizar la gestión de datos del perfil y seguridad en una sola vista para ambos roles.

## Roles y contenido visible (desde /api/auth/me)

**Padre/Tutor**
- Usuario.
- Tipo de cuenta: **Padre o tutor**.
- No muestra **Nombre completo** ni **Tarjeta profesional**.
- Muestra el correo actual como dato informativo.

**Psicólogo**
- Usuario.
- Tipo de cuenta: **Psicólogo**.
- Muestra **Nombre completo**.
- Muestra **Tarjeta profesional**.
- Muestra el correo actual como dato informativo.

## Estructura visual

- Título principal: **“Mi cuenta”** fuera de tarjetas.
- Título centrado y separado visualmente del bloque de cards.
- Layout en **2 columnas** en desktop y **1 columna** en mobile.
- Secciones en cards con fondo azul claro (mismo tono de la sidebar), borde y sombra para separar del fondo.

## Secciones y acciones

### A) Información de la cuenta
- Campos visibles:
  - **Usuario**.
  - **Tipo de cuenta** (mapeado desde roles/user_type).
  - **Nombre completo** (solo psicólogo).
  - **Tarjeta profesional** (solo psicólogo).
  - **Correo**.

### B) Seguridad (desplegables sin modals)
- Acciones:
  - **Cambiar correo**.
  - **Cambiar contraseña**.
- Comportamiento:
  - Solo un formulario abierto a la vez.
  - Animación tipo collapse (altura + opacidad) al abrir/cerrar.
  - Botón **Cancelar** cierra el panel con animación.
  - Ícono del encabezado indica acción de edición (no es “+”).
- Formularios:
  - **Cambiar correo**: correo actual (solo lectura), nuevo correo, confirmar correo, contraseña.
  - **Cambiar contraseña**: contraseña actual, nueva contraseña, confirmar nueva contraseña.
- Validaciones:
  - Mensajes cortos bajo el input.
  - Botón **Guardar cambios** deshabilitado si el formulario es inválido.
  - Reglas de contraseña reutilizan la validación global.
- UX:
  - Mensaje de éxito visible tras guardar cambios.
  - Ícono de visibilidad en campos de contraseña.

#### Checklist de requisitos (contraseña)
- Se muestra debajo del campo **Nueva contraseña**.
- Indicadores en vivo por regla.
- Clases: `.password-checklist`, `.password-check`, `.password-check-indicator`.

### C) Verificación en dos pasos (MFA)
- Solo visible para **Padre/Tutor**.
- Estados:
  - Si `mfa_enabled` es **false**: CTA **Activar MFA** + texto informativo.
  - Si `mfa_enabled` es **true**: estado **MFA activo** + CTA **Desactivar MFA**.
- UI/estructura: sin llamadas a backend por ahora.
- Para **Psicólogo** no se muestran CTAs de MFA.

### D) Cerrar sesión
- Bloque final fuera de tarjetas grandes.
- Texto + botón en la misma fila, centrados y con mayor presencia visual.
- Botón con color sólido para distinguirse del fondo.
- Al hacer clic, ejecuta logout y limpia sesión local.
- Referencia técnica: ver **Logout** en `docs/vistas/Autenticacion/InicioSesion.md`.

## Campos guardados (no visibles)

Se conservan en memoria para futuro DTO/admin, pero **no** se renderizan:
- `id`, `is_active`, `roles`, `mfa_confirmed_at`, `mfa_method`, `created_at`, `updated_at`.

## Manejo de errores de perfil (/me)

- **401**: se limpia sesión local y se redirige a login.
- **403**: mensaje “No tienes permisos para ver tu perfil.”
- **404**: mensaje “No se encontró tu perfil.”
- **5xx/red**: “No fue posible cargar tu información. Intenta más tarde.”

## Estilo de campos visibles

- Labels (**Usuario**, **Tipo de cuenta**, **Correo**, etc.): blanco más claro con peso fuerte.
- Valores (dato del usuario): blanco sin negrita para contraste.
- La tarjeta de MFA está centrada y el botón principal es blanco con texto azul.

## Navegación

- Sidebar → **Cuenta**.
- Rutas:
  - Padre/Tutor: `/padre/cuenta`
  - Psicólogo: `/psicologo/cuenta`

## Archivos relacionados

- Vista compartida (ambos roles): `src/pages/Plataforma/MiCuenta/MiCuenta.tsx`
- Estilos de la vista: `src/pages/Plataforma/MiCuenta/MiCuenta.css`
- Validación de contraseña: `src/utils/passwordValidation.ts`
