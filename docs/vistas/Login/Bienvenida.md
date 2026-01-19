# Vista: Bienvenida

## Descripción General

La vista **Bienvenida** confirma al usuario que su cuenta ha sido activada exitosamente y le ofrece opciones para continuar: iniciar sesión o volver a la página principal.

## Estructura del Componente

### Ubicación
- **Ruta del archivo**: `src/pages/Autenticacion/Bienvenida/Bienvenida.tsx`
- **Archivo de estilos**: `src/pages/Autenticacion/Bienvenida/Bienvenida.css`
- **Ruta de navegación**: `/bienvenida`

### Características Especiales
- **Sin Header ni Footer**: Vista independiente de autenticación
- **Logo navegable**: Retorno a página principal  
- **Dos botones de acción**: Alineados horizontalmente
- **Colores diferenciados**: Cada botón con su propio esquema de color

## Arquitectura Visual

### Panel Izquierdo (40%)
- Fondo azul claro sólido (#51C2F4)

### Panel Derecho (60%)

**Contenido centrado:**

#### 1. Logo e Identidad
- Icono: 36px × 36px, fondo #51C2F4
- Texto: "cognIA" 22px, color #215F8F
- Todo clickeable → `/`

#### 2. Título Principal
- Texto: "Bienvenido"
- Tamaño: 32px
- Peso: 700
- Color: #215F8F
- Alineación: centrado

#### 3. Texto de Apoyo
- Contenido: "Tu cuenta ya ha sido activada exitosamente. Ya puedes iniciar sesión, o volver a la página principal para conocer más sobre nosotros."
- Tamaño: 15px
- Color: #555
- Line-height: 1.6
- Max-width: 420px
- Alineación: centrado

#### 4. Grupo de Botones Horizontales

**Layout:**
- Flex container horizontal
- Gap entre botones: 16px
- Cada botón ocupa 50% del espacio (flex: 1)

**Botón "Iniciar sesión":**
- Color de fondo: #1790E9
- Color hover: #1370c0
- Texto en blanco
- Navegación: `/inicio-sesion`

**Botón "Volver al inicio":**
- Color de fondo: #215F8F
- Color hover: #1a4d73
- Texto en blanco
- Navegación: `/`

**Características comunes:**
- Padding: 14px 24px
- Font-size: 18px
- Font-weight: 700
- Border-radius: 10px
- Ancho: 100% (dentro de su contenedor flex)

#### 5. Versión
- Texto: "cognIA v1.0.0"
- Margen superior: 60px

## Estilos CSS

### Clases Específicas

- `.button-group-horizontal`: Contenedor flex de botones
- `.btn-primary-link`: Link wrapper (flex: 1, no decoration)
- `.btn-login-color`: Color específico para login (#1790E9)
- `.btn-home-color`: Color específico para inicio (#215F8F)

### Colores y Estados

**Botón Iniciar sesión:**
```css
background-color: #1790E9
hover: #1370c0
```

**Botón Volver al inicio:**
```css
background-color: #215F8F
hover: #1a4d73
```

## Responsive Design

- **>600px**: Botones horizontales con flex
- **<600px**: 
  - Botones apilados verticalmente (flex-direction: column)
  - Gap reducido a 12px
  - Cada botón 100% de ancho

## Navegación

- **Logo cognIA** → `/`
- **Botón "Iniciar sesión"** → `/inicio-sesion`
- **Botón "Volver al inicio"** → `/`

## Flujo de Usuario

1. Usuario llega desde vista de Activación exitosa
2. Ve mensaje de confirmación de activación
3. Lee opciones disponibles
4. Elige entre:
   - **Opción A**: Iniciar sesión inmediatamente
   - **Opción B**: Explorar más el sitio

## Notas Técnicas

- **Links con botones**: Los botones están envueltos en componentes Link de React Router
- **Flex layout**: Uso de flexbox para distribución horizontal/vertical responsive
- **Colores semánticos**: Azul intenso para login (acción primaria), azul oscuro para navegación secundaria
- **Sin estado local**: Componente presentacional sin manejo de estado
- **Transiciones**: Efectos hover suaves (0.2s ease)

## Consideraciones de UX

1. **Mensaje claro**: Confirma explícitamente que la activación fue exitosa
2. **Opciones evidentes**: Dos caminos claros para continuar
3. **Jerarquía visual**: Botón de login ligeramente más prominente (color más brillante)
4. **Flexibilidad**: Usuario puede explorar sin comprometerse a iniciar sesión de inmediato
5. **Consistencia**: Mantiene el patrón visual de split-screen de todas las vistas de autenticación
