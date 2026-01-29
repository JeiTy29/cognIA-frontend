# Vista: Header

## Descripcion general

Barra superior con navegacion principal y accesos de autenticacion. Se mantiene sobre el fondo animado con blur.

## Ubicacion

- Componente: `src/components/Header/Header.tsx`
- Estilos: `src/components/Header/Header.css`

## Estructura

- `header.header` con tres bloques:
  - `.logo` -> texto “cognIA”.
  - `nav.nav` -> enlaces a **Nuestro Sistema**, **Sobre Nosotros**, **Trastornos**.
  - `.auth-buttons` -> botones **Iniciar sesion** y **Registrarse**.

## Navegacion

- Logo y enlaces usan `href`:
  - `/` (Bienvenida)
  - `/nuestro-sistema`
  - `/sobre-nosotros`
  - `/trastornos`
  - `/inicio-sesion`
  - `/registro`

## Estilos clave

- Fondo translucido: `rgba(255,255,255,0.95)` + blur 12px.
- Linea inferior: `border-bottom` con azul tenue.
- Sombra: `0 4px 20px -2px rgba(0,0,0,0.1)`.
- Logo centrado verticalmente (`transform: translateY(-1px)`).

### Botones de autenticacion

- **Login**: gradiente **#2AA1F0 -> #1790E9**.
- **Registro**: gradiente **#2F74A9 -> #215F8F**.
- Sombra activa y elevacion en hover.

### Enlaces del menu

- Subrayado animado con `::after`.
- Hover cambia color a `var(--primary)`.

## Clases CSS clave

- `.header`, `.logo`, `.nav`, `.nav-link`, `.auth-buttons`, `.login`, `.register`.

## Responsive

- `max-width: 768px`: header se envuelve y el nav baja a una fila propia.
- `max-width: 480px`: tipografias y padding mas compactos.
