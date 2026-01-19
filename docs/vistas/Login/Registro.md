# Vista: Registro

## Descripción General

La vista **Registro** permite a nuevos usuarios crear una cuenta en cognIA mediante un proceso de dos etapas: selección de rol y formulario específico.

## Estructura del Componente

### Ubicación
- **Ruta del archivo**: `src/pages/Autenticacion/Registro/Registro.tsx`
- **Archivo de estilos**: `src/pages/Autenticacion/Registro/Registro.css`
- **Ruta de navegación**: `/registro`

### Características Especiales
- **Sin Header ni Footer**: Vista independiente de autenticación
- **Logo navegable**: Retorno a página principal via logo cognIA
- **Flujo en dos etapas**: Selección de rol + Formulario dinámico
- **Animación de transición**: Repliegue hacia arriba al seleccionar rol
- **PopUps Integrados**: Visualización de términos y privacidad sin salir de la página

## Arquitectura Visual

### Panel Izquierdo (40%)
- Fondo azul claro sólido (#51C2F4)
- Presente en todas las etapas del registro

### Panel Derecho (60%)

**Contenido centrado:**

#### Elementos Comunes

1. **Logo e Identidad** (36px icon, 22px text)
2. **Título**: "Regístrate" (32px, #215F8F, centrado)
3. **Enlace**: "¿Ya tienes una cuenta? Inicia sesión" → `/inicio-sesion`

---

## Etapa 1: Selección de Rol

### Layout
- **Alineación**: Horizontal (dos tarjetas lado a lado)
- **Gap**: 24px entre tarjetas
- **Responsive**: Se apilan verticalmente en móvil

### Tarjetas de Rol

**Dimensiones:**
- Ancho: 180px
- Alto: 280px
- Orientación: Vertical (más alto que ancho)

**Contenido:**
1. Placeholder de imagen (100px × 100px, fondo #51C2F4)
2. Texto descriptivo:
   - "Soy padre o docente"
   - "Soy psicólogo"

**Estados:**
- Normal: Borde gris, fondo claro
- Hover: Borde azul, fondo blanco, elevación 4px

**Acción al click:**
- Animación de repliegue hacia arriba
- Imagen desaparece
- Tarjeta se convierte en tag pequeño rectangular
- Aparece formulario correspondiente

---

## Etapa 2: Formulario Dinámico

### Tag de Rol
- Rectángulo pequeño con texto del rol seleccionado
- Borde azul claro
- Posición: arriba del formulario
- Permite identificar el tipo de registro activo

### Formulario Padre/Docente (3 campos)

**Campos verticales:**
1. Correo electrónico
2. Contraseña
3. Confirmar contraseña

### Formulario Psicólogo (5 campos)

**Layout:**
1. **Fila horizontal** (grid 1fr 1fr):
   - Nombre
   - Apellido
2. **Campos verticales**:
   - Correo electrónico
   - Contraseña
   - Confirmar contraseña

---

## Elementos Adicionales

### Checkbox de Términos

**Posición**: Debajo de todos los campos, antes del botón

**Contenido**:
```
☐ Confirmo haber leído los Términos de uso y Políticas de privacidad
```

**Enlaces activos:**
- "Términos de uso" → Abre PopUp (Modal) con contenido
- "Políticas de privacidad" → Abre PopUp (Modal) con contenido

**Alineación**: Texto a la izquierda

### Botón de Acción
- Texto: **"Crear cuenta"**
- Color: #1790E9
- Ancho: 100%

---

## Animaciones

### fadeIn (Selección de rol)
```css
Duración: 0.3s ease
From: opacity 0, translateY(10px)
To: opacity 1, translateY(0)
```

### collapseSlideUp (Formulario)
```css
Duración: 0.5s cubic-bezier
From: opacity 0, translateY(40px), scale(0.95)
To: opacity 1, translateY(0), scale(1)
```

## Estado del Componente

**TypeScript State:**
```typescript
type TipoUsuario = 'padre' | 'psicologo' | null;
const [rolSeleccionado, setRolSeleccionado] = useState<TipoUsuario>(null);
const [aceptaTerminos, setAceptaTerminos] = useState(false);
const [showTerms, setShowTerms] = useState(false);
const [showPrivacy, setShowPrivacy] = useState(false);
```

## Estilos CSS

### Clases específicas

- `.role-selection-horizontal`: Contenedor flex horizontal
- `.role-card-vertical`: Tarjetas verticales de rol
- `.role-image-placeholder`: Espacio para imagen (100px)
- `.role-text`: Texto del rol (16px, centrado)
- `.form-container-animated`: Wrapper con animación collapse
- `.role-tag`: Tag rectangular pequeño with rol seleccionado
- `.form-row`: Grid 1fr 1fr para nombre/apellido
- `.terms-checkbox`: Contenedor del checkbox

## Responsive Design

- **>768px**: Tarjetas horizontales, formulario completo
- **<768px**: Tarjetas apiladas verticalmente
- **<600px**: Grid de nombre/apellido cambia a columna única
- **<480px**: Tarjetas max-width 100%, placeholders 80px

## Navegación

- **Logo cognIA** → `/`
- **"Inicia sesión"** → `/inicio-sesion`
- **"Términos de uso"** → Abre Modal (no navega)
- **"Políticas de privacidad"** → Abre Modal (no navega)
- **Botón "Crear cuenta"** → `/activar-cuenta` (tras validación)

## Flujo de Usuario

1. Usuario ve título y tarjetas de rol
2. Selecciona padre/docente O psicólogo
3. Tarjetas se replegan con animación
4. Aparece tag del rol + formulario específico
5. Usuario completa todos los campos
6. Marca checkbox de términos (puede hacer click para ver detalles en PopUp)
7. Click en "Crear cuenta"
8. Navegación a vista de activación

## Notas Técnicas

- Renderizado condicional basado en `rolSeleccionado`
- Labels clickeables en checkbox
- Validación HTML nativa (`required`)
- TypeScript para tipado fuerte
- CSS Grid para layout responsive
- Animaciones CSS puras (sin JS)
- Reutilización de `TermsContent` y `PrivacyContent` en Modals
