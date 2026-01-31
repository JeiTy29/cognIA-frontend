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
  - `.auth-buttons` → botones de autenticación o acceso a plataforma.

## Comportamiento por sesión

- **Sin sesión**: muestra botones **Iniciar sesión** y **Registrarse**.
- **Con sesión**: reemplaza por botón **Empezar cuestionario**, con ruta según rol.

## Navegación

- Logo y menú usan `Link`:
  - `/` (Bienvenida)
  - `/nuestro-sistema`
  - `/sobre-nosotros`
  - `/trastornos`
- Botones de autenticación:
  - `/inicio-sesion`
  - `/registro`

## Estilos clave

- Fondo translúcido: `rgba(255,255,255,0.95)` + blur 12px.
- Línea inferior: `border-bottom` con azul tenue.
- Sombra: `0 4px 20px -2px rgba(0,0,0,0.1)`.
- Logo centrado verticalmente (`transform: translateY(-1px)`).

### Botones

- **Login**: gradiente **#2AA1F0 → #1790E9**.
- **Registro / Empezar cuestionario**: gradiente **#2F74A9 → #215F8F**.
- Sombra activa y elevación en hover.

## Clases CSS clave

- `.header`, `.logo`, `.nav`, `.nav-link`, `.auth-buttons`, `.login`, `.register`.

## Responsive

- `max-width: 768px`: header se envuelve y el nav baja a una fila propia.
- `max-width: 480px`: tipografías y padding más compactos.
