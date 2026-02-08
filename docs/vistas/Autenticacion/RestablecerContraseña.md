# RestablecerContraseña

## Propósito

Permite al usuario definir una nueva contraseña y volver a iniciar sesión, manteniendo el layout de autenticación del proyecto.

## Modal “Recuperar contraseña” (desde Inicio de sesión)

- Se abre al hacer clic en “¿Olvidaste tu contraseña?” en la vista de inicio de sesión.
- Contenido del modal:
  - Título: **Recuperar contraseña**.
  - Texto guía: “Ingresa el correo con el que te registraste y te enviaremos un enlace para restablecerla.”
  - Campo de correo con placeholder `correo@ejemplo.com`.
  - Botones: **Enviar** (primario) y **Cancelar** (secundario).
- Validación:
  - Si el correo es inválido, se muestra el mensaje “Ingresa un correo válido.”
- Estado de confirmación:
  - Mensaje: “Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.”
  - Botón único: **Entendido** (redirige a la ruta de restablecimiento).

## Vista RestablecerContraseña

### Layout
- Panel izquierdo (~40%): área visual vacía (placeholder para imagen).
- Panel derecho: contenido principal del formulario.

### Encabezado
- Título: **Restablecer contraseña**.
- Subtítulo: “Crea una nueva contraseña para volver a ingresar.”

### Formulario
- **Nueva contraseña** con toggle mostrar/ocultar.
- **Requisitos de contraseña** (checklist visual, sin viñetas):
  - Mínimo 8 caracteres.
  - Al menos una mayúscula.
  - Al menos una minúscula.
  - Al menos un número.
  - Al menos un carácter especial.
- **Confirmar nueva contraseña** con toggle mostrar/ocultar.
- Feedback en vivo para coincidencia de contraseñas.

### Acción principal
- Botón: **Guardar contraseña**.
- Si la validación es correcta, se muestra un **modal bloqueante** con el mensaje:
  - “Contraseña actualizada. Ya puedes iniciar sesión.”
  - Botón único: **Ir a inicio de sesión**.

### Navegación secundaria
- Enlace: **Volver a inicio de sesión**.

## Rutas
- `GET /restablecer-contrasena` → Vista RestablecerContraseña.
- Modal desde Login no navega automáticamente; el botón **Entendido** redirige a `/restablecer-contrasena`.
- El modal de éxito redirige a `/inicio-sesion`.
