# Vista: Mi cuenta

## Propósito

Centralizar la gestión de datos del perfil y seguridad en una sola vista para ambos roles.

## Roles y contenido visible

**Padre/Tutor**
- Tipo de cuenta: **Padre o tutor**.
- No muestra campo de nombre.
- Muestra el correo actual como dato informativo.

**Psicólogo**
- Tipo de cuenta: **Psicólogo**.
- Muestra el campo **Nombre**.
- Muestra el correo actual como dato informativo.

## Estructura visual

- Título principal: **“Mi cuenta”** fuera de tarjetas.
- Título centrado y separado visualmente del bloque de cards.
- Layout en **2 columnas** en desktop y **1 columna** en mobile.
- Secciones en cards con fondo azul claro (mismo tono de la sidebar), borde y sombra para separar del fondo.

## Secciones y acciones

### A) Información de la cuenta
- Campos visibles:
  - **Tipo de cuenta**.
  - **Nombre** (solo psicólogo).
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

### C) Cerrar sesión
- Bloque final fuera de tarjetas grandes.
- Texto + botón en la misma fila, centrados y con mayor presencia visual.
- Botón con color sólido para distinguirse del fondo.

## Navegación

- Sidebar → **Cuenta**.
- Rutas:
  - Padre/Tutor: `/padre/cuenta`
  - Psicólogo: `/psicologo/cuenta`

## Archivos relacionados

- Vista compartida (ambos roles): `src/pages/Plataforma/MiCuenta/MiCuenta.tsx`
- Estilos de la vista: `src/pages/Plataforma/MiCuenta/MiCuenta.css`
- Validación de contraseña: `src/utils/passwordValidation.ts`
