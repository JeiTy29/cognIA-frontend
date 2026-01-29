# Vista: Bienvenida

## Proposito

Landing inicial de CognIA. Es la primera vista al entrar al sitio y no utiliza el Header actual.

## Ubicacion

- Componente: `src/pages/Inicio/Bienvenida/Bienvenida.tsx`
- Estilos: `src/pages/Inicio/Bienvenida/Bienvenida.css`
- Ruta: `/`

## Estructura

- Contenedor principal `.bienvenida-page` que ocupa casi toda la pantalla.
- Marca superior con placeholder de logo + texto **cognIA** destacado.
- Titulo principal **&iexcl;Bienvenido!** y descripcion del objetivo del sistema.
- Dos tarjetas CTA grandes `.cta-card` con:
  - Placeholder de imagen.
  - Titulo y descripcion.
  - Boton principal con flecha a la derecha.

## Navegacion

- Boton **Explorar** -> `/nuestro-sistema`.
- Boton **Empezar** -> `/inicio-sesion`.

## Fondo con ola y patron animado

- El bloque azul inferior es `.blueArea`, con `height: 60vh`, fondo transparente y `overflow: hidden`, para que la parte superior quede con curva animada.
- Dentro del bloque azul se crean 3 capas de ondas (una por profundidad):
  - `<div class="waveLayer waveLayer--1" />` (frente)
  - `<div class="waveLayer waveLayer--2" />` (media)
  - `<div class="waveLayer waveLayer--3" />` (fondo)
- Cada capa usa un SVG de **relleno** (no solo linea) con borde superior ondulado y `background-repeat: repeat-x`.
- El borde superior de cada capa es la “ola” visible; al moverse, la curva superior se anima (no queda recta).
- La animacion se logra moviendo `background-position` con `@keyframes waveShiftX` y un bamboleo vertical suave con `@keyframes waveBobX`.
- Las duraciones son largas y con `linear`/`ease-in-out` para movimiento continuo sin saltos visibles.
- Accesibilidad: en `prefers-reduced-motion` se desactivan las animaciones.

## Estilos clave

- Tarjetas con sombra marcada para separar del fondo.
- Botones con bordes menos redondeados y un recuadro lateral con flecha.

## Responsive

- Desktop: todo el contenido en una pantalla (minimo scroll).
- Mobile: tarjetas apiladas en una sola columna y tipografias mas compactas.
