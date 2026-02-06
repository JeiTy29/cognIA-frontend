# Vista: Trastornos

## Descripción general

Presenta el **Gráfico de trastornos** (círculo central + 5 trastornos) y una sección informativa al pie.

## Ubicación

- Componente: `src/pages/Inicio/Trastornos/Trastornos.tsx`
- Estilos: `src/pages/Inicio/Trastornos/Trastornos.css`
- Ruta: `/trastornos`
- Íconos: `src/assets/Iconos/Trastornos/`.

## Datos del gráfico

Cada trastorno se define en el arreglo `disorders` con:

- `title`, `fullDescription`.
- `position` (0–4) para ubicación circular.
- `icon` (PNG de la carpeta de íconos).

### Iconografía (assets)

- Ansiedad → `Ansiedad.png`
- Depresión → `Depresion.png`
- TDAH → `TDAH.png`
- Trastorno de eliminación → `Trastorno de Eliminacion.png`
- Trastorno de conducta → `Trastorno de Conducta.png`

## Estados y lógica (TypeScript)

- `expandedDisorder: number | null` → índice expandido.
- `hoveredDisorder: number | null` → hover para realce visual.

Interacciones:
- **Click en círculo** → expande hacia la derecha y revela descripción larga.
- **Click fuera** → vuelve al estado base.
- **Click en otro círculo** → colapsa el anterior y expande el nuevo.

## Estilos clave

- Círculo central: **620px**, borde azul **#1790E9** (solo contorno).
- Círculos pequeños: **220px** con gradiente azul.
- Íconos: **170px** en estado base.
- Expandido: círculo crece a **460px** y se mueve con `translateX(520px)`.
- El wrapper aplica `translateX(-90px)` cuando hay un círculo expandido y agrega padding derecho.
- Movimiento suave: transiciones **0.7s** en `transform`, `width`, `height`.
- Ícono se oculta al expandir (`.disorder-circle.expanded .disorder-icon`).
- Hover: círculo se realza con sombra y crece a **238px**.
- Descripción larga: texto justificado con alineación final centrada.

## Sección informativa

- Banner sobrio `.info-banner` con frase principal y secundaria.
- Fondo suave **#F5FAFF** y borde izquierdo sutil.

## Clases CSS clave

- `.circle-diagram-wrapper`, `.circle-diagram`, `.disorder-circle`, `.large-circle`.
- `.info-banner`, `.info-banner-title`, `.info-banner-subtitle`.

## Responsive

- `max-width: 1024px`: reduce tamaños del diagrama y posiciones.
- `max-width: 768px`: layout vertical, sin círculo central, descripción siempre visible.
- `max-width: 480px`: padding más compacto y tipografía menor.

## Flujo de usuario

1. Observa el gráfico centrado bajo el título.
2. Hace clic en un trastorno → se expande a la derecha con descripción larga.
3. Hace clic fuera → el gráfico vuelve al estado base.
