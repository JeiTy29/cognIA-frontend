# Vista: Políticas de Privacidad

## Descripción general

Página legal con contenido de privacidad y enlaces contextuales al registro.

## Ubicación

- Componente: `src/pages/Inicio/Privacy/Privacy.tsx`
- Estilos: `src/pages/Inicio/Privacy/Privacy.css`
- Ruta: `/privacy`
- Se muestra con Header y Footer (ver `src/App.tsx`).

## Lógica de navegación

- Si la URL incluye `?from=registro`, se muestra botón **“Volver al formulario de registro”**.
- El botón ejecuta `navigate(-1)`.

## Estructura

- `.privacy-title` y `.privacy-subtitle` centrados.
- `.content-card` con texto legal.
- Link interno a `Términos y Condiciones`.
- Link inferior “Volver al inicio”.

## Estilos clave

- Fondo blanco, card con sombra y padding de 2rem.
- Botón de regreso: **#1790E9**, hover **#1370c0** con desplazamiento.

## Clases CSS clave

- `.privacy-page`, `.privacy-title`, `.content-card`, `.back-to-form-button`.

## Reutilización

- `PrivacyContent` se exporta y se usa dentro de los modales de registro.

## Responsive

- `max-width: 768px`: título 2rem, subtítulo 1rem, padding menor.
