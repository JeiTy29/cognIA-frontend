# Vista: Header

## Descripción general

Barra superior con navegación principal y accesos de autenticación. Se mantiene sobre el fondo animado con blur.

## Ubicación

- Componente: `src/components/Header/Header.tsx`
- Estilos: `src/components/Header/Header.css`

## Estructura

- `header.header` con tres bloques:
  - `.logo` → texto “cognIA”.
  - `nav.nav` → enlaces a **Nuestro Sistema**, **Sobre Nosotros**, **Trastornos**.
  - `.auth-buttons` → botones **Iniciar sesión** y **Registrarse**.

## Navegación

- Logo y enlaces usan `href`:
  - `/` (Nuestro Sistema)
  - `/sobre-nosotros`
  - `/trastornos`
  - `/inicio-sesion`
  - `/registro`

## Estilos clave

- Fondo translúcido: `rgba(255,255,255,0.95)` + blur 12px.
- Línea inferior: `border-bottom` con azul tenue.
- Sombra: `0 4px 20px -2px rgba(0,0,0,0.1)`.
- Logo centrado verticalmente (`transform: translateY(-1px)`).

### Botones de autenticación

- **Login**: gradiente **#2AA1F0 → #1790E9**.
- **Registro**: gradiente **#2F74A9 → #215F8F**.
- Sombra activa y elevación en hover.

### Enlaces del menú

- Subrayado animado con `::after`.
- Hover cambia color a `var(--primary)`.

## Clases CSS clave

- `.header`, `.logo`, `.nav`, `.nav-link`, `.auth-buttons`, `.login`, `.register`.

## Responsive

- `max-width: 768px`: header se envuelve y el nav baja a una fila propia.
- `max-width: 480px`: tipografías y padding más compactos.
