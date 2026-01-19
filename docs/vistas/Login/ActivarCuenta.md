# Vista: Activar Cuenta

## Descripción General

La vista **Activar Cuenta** permite a los usuarios verificar su correo electrónico ingresando un código de 6 dígitos enviado a su dirección de email tras el registro.

## Estructura del Componente

### Ubicación
- **Ruta del archivo**: `src/pages/Autenticacion/ActivarCuenta/ActivarCuenta.tsx`
- **Archivo de estilos**: `src/pages/Autenticacion/ActivarCuenta/ActivarCuenta.css`
- **Ruta de navegación**: `/activar-cuenta`

### Características Especiales
- **Sin Header ni Footer**: Vista independiente de autenticación
- **Logo navegable**: Retorno a página principal 
- **6 campos individuales**: Un carácter por campo
- **Auto-focus**: Avance automático entre campos
- **Mayúsculas automáticas**: Las letras se muestran en mayúsculas
- **Tarjeta azul**: Campos dentro de contenedor azul (#51C2F4)

## Arquitectura Visual

### Panel Izquierdo (40%)
- Fondo azul claro sólido (#51C2F4)

### Panel Derecho (60%)

**Contenido centrado:**

#### 1. Logo e Identidad
- Icono: 36px × 36px
- Texto: "cognIA" 22px
- Clickeable → `/`

#### 2. Título Principal
- Texto: "Activa tu cuenta"
- Tamaño: 32px
- Color: #215F8F
- Alineación: centrado

#### 3. Texto de Apoyo
- Contenido: "Para poder activar tu cuenta, escribe a continuación el código que fue enviado a tu correo electrónico"
- Tamaño: 15px
- Color: #555
- Max-width: 420px
- Line-height: 1.6
- Alineación: centrado

#### 4. Tarjeta de Código

**Contenedor:**
- Fondo: #51C2F4 (azul sólido)
- Border-radius: 16px
- Padding: 40px 30px
- Ancho: 100%

**6 Campos de Entrada:**
- Dimensiones: 50px × 60px cada uno
- Gap entre campos: 12px
- Fondo: blanco
- Bordes: 3px sólidos blancos
- Font-size: 28px
- Font-weight: 700
- Color texto: #215F8F
- Text-align: center
- Border-radius: 10px

**Funcionalidad:**
- Solo acepta letras y números
- Máximo 1 carácter por campo
- Letras convertidas a mayúsculas automáticamente
- Auto-focus al siguiente campo al ingresar carácter
- Backspace navega al campo anterior si está vacío

#### 5. Botón Confirmar
- Texto: "Confirmar"
- Color: #1790E9
- Texto blanco
- Ancho: 100%

#### 6. Versión
- Texto: "cognIA v1.0.0"
- Margen superior: 60px

## Estado del Componente

```typescript
const [codigo, setCodigo] = useState(['', '', '', '', '', '']);
```

**Array de 6 strings**: Cada posición representa un dígito del código

## Lógica de Input

### handleCodigoChange
```typescript
- Valida input con regex: /^[A-Za-z0-9]*$/
- Convierte a mayúsculas: value.toUpperCase()
- Auto-focus siguiente campo si value existe e index < 5
- Actualiza array de código
```

### handleKeyDown
```typescript
- Detecta tecla Backspace
- Si campo vacío y no es el primer campo:
  - Hace focus al campo anterior
```

## Estilos CSS

### Clases Específicas

- `.auth-support-text`: Texto de apoyo (15px, centrado)
- `.codigo-card`: Tarjeta azul contenedora
- `.codigo-inputs`: Flex container con gap 12px
- `.codigo-input`: Campo individual de código
  - Focus: borde azuloscuro, scale(1.05)

## Responsive Design

- **>600px**: Tarjeta 40px padding, inputs 50px × 60px, gap 12px
- **<600px**: Tarjeta 32px padding, inputs 42px × 52px, gap 8px
- **<480px**: Tarjeta 28px padding, inputs 38px × 48px, gap 6px

## Navegación

- **Logo cognIA** → `/`
- **Botón "Confirmar"** → `/bienvenida` (tras validación de código)

## Validación

**Input permitido:**
- Letras A-Z (mostradas en mayúsculas)
- Números 0-9
- Sin espacios ni caracteres especiales

**Restricciones:**
- Exactamente 6 caracteres
- Validación completa al presionar "Confirmar"

## Flujo de Usuario

1. Usuario llega desde página de registro
2. Ve título y mensaje instructivo
3. Recibe email con código de 6 dígitos
4. Ingresa primer dígito
5. Automáticamente pasa al siguiente campo
6. Repite hasta completar 6 dígitos
7. Click en "Confirmar"
8. Validación del código
9. Navegación a vista de Bienvenida

## Notas Técnicas

- **IDs dinámicos**: `codigo-${index}` para cada input
- **Focus programático**: `document.getElementById()`
- **Validación regex**: Caracteres alfanuméricos solamente
- **Transformación**: `toUpperCase()` automático
- **Estado React**: Array de strings para cada dígito
- **Accesibilidad**: IDs únicos permiten fácil navegación
