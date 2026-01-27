# Vista: Footer

## Descripción general

Pie de página institucional con contacto y enlaces legales.

## Ubicación

- Componente: `src/components/Footer/Footer.tsx`
- Estilos: `src/components/Footer/Footer.css`

## Estructura

- `.footer` → contenedor principal negro.
- `.footer-content` (flex) con tres bloques:
  1. Copyright.
  2. Email de contacto.
  3. Enlaces legales.

## Enlaces

- `Políticas de privacidad` → abre modal con `PrivacyContent`.
- `Términos de uso` → abre modal con `TermsContent`.
- Email: `mailto:contacto@cognia.edu.co`.

## Estilos clave

- Fondo negro **#000**, texto blanco.
- Tipografía 0.9rem, enlaces subrayados en hover.
- Layout flexible con `flex-wrap`.

## Clases CSS clave

- `.footer`, `.footer-content`, `.footer-links`, `.footer-link`, `.footer-contact`.

## Responsive

- `max-width: 768px`: columnas apiladas y centradas.
