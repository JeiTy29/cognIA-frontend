# Vista: Bienvenida

## Proposito

Landing inicial de CognIA. Es la primera vista al entrar al sitio y no utiliza el Header actual.

## Ubicacion

- Componente: `src/pages/Inicio/Bienvenida/Bienvenida.tsx`
- Estilos: `src/pages/Inicio/Bienvenida/Bienvenida.css`
- Ruta: `/`

## Estructura

- Contenedor principal `.bienvenida-page` que ocupa casi toda la pantalla.
- Marca superior con placeholder de logo + texto **cognIA**.
- Titulo principal **&iexcl;Bienvenido!** y descripcion del objetivo del sistema.
- Dos tarjetas CTA grandes `.cta-card` con:
  - Placeholder de imagen.
  - Titulo y descripcion.
  - Boton principal.

## Navegacion

- Boton **Explorar** -> `/nuestro-sistema`.
- Boton **Empezar** -> `/inicio-sesion`.

## Fondo con ola y patron animado

- Bloque azul inferior `.bienvenida-wave-block` con una curva tipo ola (`.wave-divider`) que separa el fondo claro del bloque azul.
- Patron de ondas sutil `.wave-pattern` dentro del bloque azul con un SVG repetido.
- Animacion `wavePatternMove` mueve el patron en loop suave (sin JS).

## Responsive

- Desktop: todo el contenido en una pantalla (minimo scroll).
- Mobile: tarjetas apiladas en una sola columna y tipografias mas compactas.
