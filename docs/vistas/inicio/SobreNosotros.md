# Vista: Sobre Nosotros

## Descripción general

Página institucional con el equipo de desarrollo y datos de contacto.

## Ubicación

- Componente: `src/pages/Inicio/SobreNosotros/SobreNosotros.tsx`
- Estilos: `src/pages/Inicio/SobreNosotros/SobreNosotros.css`
- Ruta: `/sobre-nosotros`

## Estructura

### Sección Equipo

- Título `.section-title` → “Equipo de desarrollo”.
- Texto descriptivo `.team-description`.
- Grid `.team-grid` con 3 tarjetas `.team-card.info-card`.

### Sección Contacto

- Título `.section-title` → “Contáctanos”.
- Grid `.contact-grid` con 2 tarjetas `.contact-card.info-card`.

## Estilos clave

- Tarjetas heredan `.info-card` global.
- Placeholder de foto: `.dev-image-placeholder` (180px) con borde azul suave.
- Hover en foto: `scale(1.05)` y borde más vivo.
- Logo universidad: `.university-logo-placeholder` contiene la imagen `UDEC.png` con `.university-logo` (140px, `object-fit: contain`).
- Logos de contacto: `.university-logo-placeholder` / `.cognia-logo-placeholder` (140px, borde gris).
- Roles en azul oscuro: `.dev-role` **#215F8F**.

## Clases CSS clave

- `.team-grid`, `.team-card`, `.dev-image-placeholder`, `.contact-grid`, `.contact-card`.

## Responsive

- `max-width: 1024px`: equipo en 2 columnas, última tarjeta centrada.
- `max-width: 768px`: todo en columna, paddings reducidos.
- `max-width: 480px`: texto y tamaños compactos.
