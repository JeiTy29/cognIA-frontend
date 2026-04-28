# Vista: Registro

## Descripción general

Flujo de creación de cuenta con selección de rol, formularios dinámicos, validación de contraseña y aceptación de términos.

## Ubicación

- Componente: `src/pages/Autenticacion/Registro/Registro.tsx`
- Estilos: `src/pages/Autenticacion/Registro/Registro.css`
- Ruta: `/registro`
- Reutiliza el layout `auth-*` definido en `InicioSesion.css`.

---

## Etapa 1: Selección de rol

### Layout

- Contenedor horizontal `.role-selection-horizontal`.
- Dos tarjetas `.role-card-vertical`:
  - **Padre/Docente**
  - **Psicólogo**
- Cada tarjeta incluye `.role-image-placeholder` (bloque para imagen/ilustración).

### Estados visuales

- Normal: borde **#E0E0E0**, fondo **#F9FAFB**.
- Hover: borde **#1790E9**, fondo **#FFFFFF**, sombra `rgba(23,144,233,0.15)`.

### Acción al click

- Al seleccionar, se ocultan las tarjetas y se muestra el formulario con animación `collapseSlideUp`.

---

## Etapa 2: Formulario dinámico

### Tag del rol

- Botón `.role-tag` con texto del rol activo.
- Permite volver a la selección inicial (resetea estados y campos).

### Formulario Padre/Docente (guardian)

Campos:
1. Nombre de usuario (case-sensitive, patrón `^[A-Za-z0-9._-]{3,32}$`)
2. Correo electrónico
3. Contraseña
4. Confirmar contraseña

Payload enviado:
- `username`, `email`, `password`, `user_type: "guardian"`

### Formulario Psicólogo (psychologist)

Campos:
1. Nombre completo
2. Nombre de usuario (case-sensitive, patrón `^[A-Za-z0-9._-]{3,32}$`)
3. Correo electrónico
4. Número de tarjeta profesional
5. Contraseña
6. Confirmar contraseña

Payload enviado:
- `username`, `email`, `password`, `full_name`, `professional_card_number`, `user_type: "psychologist"`

---

## Endpoint de registro

- `POST /api/auth/register`
- Base URL: `VITE_API_BASE_URL`
  - puede configurarse con o sin `/api`;
  - el frontend normaliza la URL antes de consumir el endpoint;
  - recomendado: usar el origen sin `/api`.

---

## Manejo de respuestas

- **201**: muestra éxito y redirige a `/inicio-sesion`.
- **400**: "Revisa los datos ingresados. Verifica correo/usuario y el formato de la contraseña."
- **500**: "Ocurrió un error en el servidor. Intenta nuevamente en unos minutos."
- Otros: "Ocurrió un error al registrar. Intenta nuevamente."

---

## Validaciones

- Contraseña mínima **8 caracteres**.
- Debe incluir: mayúscula, minúscula, número y carácter especial.
- Confirmación debe coincidir con contraseña.
- Mensajes de error en `.validation-error`.

### Checklist de requisitos

- Se muestra debajo del campo “Contraseña” en ambos formularios.
- Indicadores en vivo para cada regla.
- Clases: `.password-checklist`, `.password-check`, `.password-check-indicator`.

---

## Términos y privacidad

### Checkbox de aceptación

- Deshabilitado hasta abrir ambos modales (`hasOpenedTerms`, `hasOpenedPrivacy`).
- Mensaje de ayuda en azul cuando faltan lecturas.
- Botón **"Crear cuenta"** se habilita solo si `aceptaTerminos` está activo.

### Modales

- Se controlan con `showTerms` / `showPrivacy`.
- `Modal` aplica animación de salida sutil con clase `.is-closing`.

---

## Estados principales (TypeScript)

```ts
const [rolSeleccionado, setRolSeleccionado]
const [aceptaTerminos, setAceptaTerminos]
const [hasOpenedTerms, setHasOpenedTerms]
const [hasOpenedPrivacy, setHasOpenedPrivacy]
const [errorContrasena, setErrorContrasena]
const [errorConfirmar, setErrorConfirmar]
const [errorTerminos, setErrorTerminos]
const [submitError, setSubmitError]
const [submitSuccess, setSubmitSuccess]
```

---

## Navegación

- Logo superior -> `/`.
- Link "Inicia sesión" -> `/inicio-sesion`.
- Submit válido -> `/inicio-sesion`.

---

## Flujo de usuario

1. Selecciona rol (padre/docente o psicólogo).
2. Completa el formulario correspondiente.
3. Abre términos y privacidad (modales).
4. Marca el checkbox de aceptación.
5. Click en **Crear cuenta** -> `/inicio-sesion`.

---

## Clases CSS clave

- `.role-selection-horizontal`, `.role-card-vertical`, `.role-tag`, `.terms-checkbox`, `.validation-error`, `.validation-success`, `.password-checklist`.

## Responsive

- Tarjetas en horizontal en desktop.
- Apiladas en móvil (`max-width: 768px`).
