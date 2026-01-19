# Vista: Inicio de Sesión

## Descripción General

La vista **Inicio de Sesión** permite a los usuarios autenticarse en el sistema cognIA mediante sus credenciales (correo electrónico y contraseña).

## Estructura del Componente

### Ubicación
- **Ruta del archivo**: `src/pages/Autenticacion/InicioSesion/InicioSesion.tsx`
- **Archivo de estilos**: `src/pages/Autenticacion/InicioSesion/InicioSesion.css`
- **Ruta de navegación**: `/inicio-sesion`

### Características Especiales
- **Sin Header ni Footer**: La vista de autenticación no incluye el encabezado ni pie de página del sitio principal
- **Logo navegable**: El icono y texto "cognIA" funcionan como enlace de retorno a la página principal

## Arquitectura Visual

### Panel Izquierdo (40%)
- Fondo azul claro sólido (#51C2F4)
- Espacio reservado para imagen representativa
- Se oculta en dispositivos móviles (<768px)

### Panel Derecho (60%)

**Contenido centrado (vertical y horizontalmente):**

#### 1. Logo e Identidad
- Icono cuadrado: 36px × 36px con fondo azul claro
- Texto "cognIA": 22px, color #215F8F
- Todo el conjunto es clickeable y navega a "/"

#### 2. Título Principal
- Texto: "Iniciar sesión"
- Tamaño: 32px
- Peso: 700
- Color: #215F8F
- Alineación: centrado

#### 3. Enlace a Registro
- Texto: "¿Aún no tienes una cuenta? Regístrate"
- "Regístrate" resaltado en azul (#1790E9)
- Navegación a `/registro`
- Alineación: centrado

#### 4. Formulario
**Campos:**
- Correo electrónico (email, required)
- Contraseña (password, required)

**Características:**
- Bordes redondeados: 10px
- Padding: 14px vertical, 18px horizontal
- Focus: borde azul (#1790E9)
- Placeholders alineados a la izquierda
- **Toggle de contraseña**: Icono de ojo para mostrar/ocultar contraseña
  - Ojo normal: Contraseña visible
  - Ojo tachado: Contraseña oculta (puntos)
  - Color: #666, hover #1790E9

#### 5. Botón Principal
- Texto: "Ingresar"
- Color: #1790E9 (fondo), blanco (texto)
- Ancho: 100%
- Hover: color más oscuro y elevación

#### 6. Enlace de Recuperación
- Texto: "¿Olvidaste tu contraseña?"
- Color: #1790E9
- Tamaño: 14px
- Alineación: centrado

#### 7. Versión
- Texto: "cognIA v1.0.0"
- Color: #999
- Tamaño: 13px
- Margen superior: 60px

## Estilos CSS

### Clases Globales de Autenticación
(Compartidas con todas las vistas de autenticación)

- `.auth-container`: Contenedor flex de altura completa
- `.auth-left-panel`: Panel izquierdo azul (40%)
- `.auth-right-panel`: Panel derecho blanco (60%)
- `.auth-content`: Contenedor centrado (max-width 450px)
- `.auth-logo-link`: Enlace del logo a página principal
- `.auth-header`: Flex container para logo + nombre
- `.auth-logo-icon`: Icono cuadrado 36px
- `.auth-system-name`: Nombre del sistema 22px
- `.auth-title`: Títulos principales 32px
- `.auth-subtitle`: Subtítulos 16px
- `.link-highlight`: Enlaces azul resaltado

### Clases Específicas

- `.auth-form`: Contenedor del formulario
- `.form-group`: Wrapper de cada campo
- `.form-input`: Campos de entrada
- `.btn-primary`: Botón principal
- `.forgot-password-link`: Enlace de recuperación
- `.version-footer`: Versión del sistema

## Responsive Design

- **>968px**: Layout completo 40/60
- **768-968px**: Layout ajustado 35/65
- **<768px**: Panel izquierdo oculto, formulario 100%
- **<480px**: Logo y textos más pequeños

## Navegación

- **Logo cognIA** → `/` (página principal)
- **"Regístrate"** → `/registro`
- **"¿Olvidaste tu contraseña?"** → `/recuperar-contrasena` (por implementar)
- **Botón "Ingresar"** → Submit (integración backend pendiente)

## Notas Técnicas

- Validación HTML nativa con `required`
- Transiciones CSS suaves (0.2s ease)
- Todos los textos centrados excepto placeholders
- Layout responsive automático
- Sin dependencia de Header/Footer global
- **Estado React**: `mostrarContrasena` para toggle de visibilidad
- **Iconos SVG**: Ojo/ojo tachado inline
- **Botón toggle**: Posicionado absolute dentro del input group
