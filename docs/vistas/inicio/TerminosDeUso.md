# Vista: Términos de Uso

## Descripción general

Página legal con condiciones del servicio.

## Ubicación

- Componente: `src/pages/Inicio/Terms/Terms.tsx`
- Estilos: `src/pages/Inicio/Terms/Terms.css`
- Ruta: `/terms`
- Se muestra con Header y Footer (ver `src/App.tsx`).

## Lógica de navegación

- Si la URL incluye `?from=registro`, se muestra botón **“Volver al formulario de registro”**.
- El botón ejecuta `navigate(-1)`.

## Estructura

- `.terms-title` y `.terms-subtitle` centrados.
- `.content-card` con texto legal.
- Link interno a **Políticas de Privacidad**.

## Estilos clave

- Fondo blanco, card con sombra y padding de 2rem.
- Botón de regreso con color primario **#1790E9** y hover desplazado.

## Clases CSS clave

- `.terms-page`, `.terms-title`, `.content-card`, `.back-to-form-button`.

## Reutilización

- `TermsContent` se exporta y se usa dentro de los modales de registro.

## Responsive

- `max-width: 768px`: título 2rem, subtítulo 1rem, padding menor.
