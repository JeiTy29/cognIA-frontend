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

### Formulario Padre/Docente

Campos:
1. Correo electrónico
2. Contraseña
3. Confirmar contraseña
4. Checkbox **“Activar autenticación en dos pasos”** (opcional)
   - Si se activa, se muestra `.twofactor-hint` con aviso de apps compatibles.

### Formulario Psicólogo

Campos:
1. Nombre
2. Apellido
3. Correo electrónico
4. Número de operador nacional
5. Contraseña
6. Confirmar contraseña

---

## Validaciones

- Contraseña mínima **8 caracteres**.
- Debe incluir: mayúscula, minúscula, número y carácter especial.
- Confirmación debe coincidir con contraseña.
- Mensajes de error en `.validation-error`.

---

## Términos y privacidad

### Checkbox de aceptación

- Deshabilitado hasta abrir ambos modales (`hasOpenedTerms`, `hasOpenedPrivacy`).
- Mensaje de ayuda en azul cuando faltan lecturas.
- Botón **“Crear cuenta”** se habilita solo si `aceptaTerminos` está activo.

### Modales

- Se controlan con `showTerms` / `showPrivacy`.
- `Modal` aplica animación de salida sutil con clase `.is-closing`.

---

## Estados principales (TypeScript)

```ts
const [rolSeleccionado, setRolSeleccionado]
const [aceptaTerminos, setAceptaTerminos]
const [usarDosPasos, setUsarDosPasos]
const [hasOpenedTerms, setHasOpenedTerms]
const [hasOpenedPrivacy, setHasOpenedPrivacy]
const [errorContrasena, setErrorContrasena]
const [errorConfirmar, setErrorConfirmar]
const [errorTerminos, setErrorTerminos]
```

---

## Navegación

- Logo superior → `/`.
- Link “Inicia sesión” → `/inicio-sesion`.
- Submit válido → `/activar-cuenta`.

---

## Flujo de usuario

1. Selecciona rol (padre/docente o psicólogo).
2. Completa el formulario correspondiente.
3. Abre términos y privacidad (modales).
4. Marca el checkbox de aceptación.
5. Click en **Crear cuenta** → `/activar-cuenta`.

---

## Clases CSS clave

- `.role-selection-horizontal`, `.role-card-vertical`, `.role-tag`, `.terms-checkbox`, `.twofactor-option`.

## Responsive

- Tarjetas en horizontal en desktop.
- Apiladas en móvil (`max-width: 768px`).
