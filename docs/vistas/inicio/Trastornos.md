# Vista: Trastornos

## Descripción General

La vista **Trastornos** presenta información educativa sobre los cinco trastornos psicológicos infantiles que el sistema cognIA está diseñado para identificar. Utiliza un diseño visual único basado en círculos interactivos que se expanden al hacer clic para mostrar información detallada.

## Estructura del Componente

### Ubicación
- **Ruta del archivo**: `src/pages/Inicio/Trastornos/Trastornos.tsx`
- **Archivo de estilos**: `src/pages/Inicio/Trastornos/Trastornos.css`
- **Ruta de navegación**: `/trastornos`

### Arquitectura Visual

#### Diagrama Circular de Trastornos

La vista presenta un diseño interactivo grande y prominente:

1. **Contenedor Principal**: 
   - Max-width: 1600px (muy amplio)
   - Padding superior mínimo: **20px** (muy cercano al header)
   - Margin superior: **20px** (posicionado alto en la página)
   - Min-height de sección: 1100px (muy espaciosa)

2. **Círculo Grande Central**: 
   - Borde negro de 3px
   - Solo contorno, sin relleno
   - Diámetro de **800px** (muy grande para máxima visibilidad)
   - Diagrama contenedor de **900px × 900px**
   - Radio de distribución de círculos: **380px**

3. **Cinco Círculos de Trastornos Interactivos - MUY GRANDES**:
   - Fondo con gradiente: `linear-gradient(135deg, #51C2F4 0%, #6CD4FF 100%)`
   - Texto blanco para alto contraste
   - **Dimensiones muy amplias para máxima presencia visual**:
     - Estado normal: **300px × 300px**
     - Estado hover: **320px × 320px**
     - Estado expandido: **500px × 500px**
   - Posicionados usando coordenadas polares con radio de 380px
   - Padding adaptativo: 32px normal, 48px expandido
   - Tamaños de fuente grandes: Título 26px, descripción 16px, completa 17px
   - Box-shadows más pronunciadas para mayor profundidad

#### Trastornos Presentados

Cada círculo contiene:

**Título del trastorno** (18px, font-weight 700, color blanco):
1. Ansiedad
2. Depresión
3. TDAH
4. Trastorno de eliminación
5. Trastorno de conducta

**Descripción resumida** (12px, color blanco):
- Explicación clara y accesible del trastorno
- Visible en el estado normal del círculo
- Orientada a un público general sin conocimientos técnicos
- Enfoque en síntomas observables en niños

**Descripción completa** (13px, color blanco):
- Se muestra cuando el círculo está expandido
- Información más detallada con síntomas específicos
- Scroll vertical si el contenido lo requiere

#### Interactividad

**Estados del círculo**:

1. **Estado Normal**:
   - Muestra título y descripción resumida
   - Tamaño: 160px × 160px
   - Cursor pointer indica interactividad

2. **Estado Hover**:
   - El círculo se expande ligeramente en su misma posición
   - Tamaño: 180px × 180px
   - Aparece mensaje "Da clic para saber más" debajo del círculo
   - Box-shadow más pronunciado
   - El círculo NO se mueve al centro, permanece en su ubicación

3. **Estado Expandido**:
   - Al hacer clic, el círculo se expande aún más en su misma posición
   - Tamaño: 300px × 300px
   - Muestra descripción completa en lugar de la resumida
   - z-index más alto para aparecer sobre otros círculos
   - Padding aumentado para mejor legibilidad

**Comportamiento de cierre**:
- Al hacer clic nuevamente en el círculo expandido, vuelve a su estado normal
- Animación suave de transición (0.4s cubic-bezier)

#### Sección Informativa

Debajo del diagrama circular se encuentra una tarjeta informativa con:

- **Título**: "No lo olvides, estos no son los únicos trastornos"
  - Utiliza la clase global `.section-title` (2.2rem, color #215F8F)
  
- **Contenido**: Dos puntos importantes:
  1. Limitación del alcance del sistema a los cinco trastornos presentados
  2. Recordatorio de que los resultados no constituyen diagnóstico clínico
  
- **Estilos**: Utiliza la clase global `.info-card` para mantener consistencia visual

## Estilos CSS

### Clases Principales

- `.trastornos-container`: Contenedor principal con padding de 80px
- `.circle-diagram`: Wrapper relativo para el posicionamiento circular (700px × 700px)
- `.large-circle`: Círculo grande con borde negro (600px × 600px)
- `.disorder-circle`: Círculos individuales de trastornos:
  - Posicionamiento absoluto calculado mediante trigonometría
  - Atributo `data-position` (0-4) para determinar ubicación
  - Transición suave de 0.4s con cubic-bezier personalizado
- `.disorder-circle.hovered`: Estado hover (180px × 180px)
- `.disorder-circle.expanded`: Estado expandido (300px × 300px)
- `.disorder-description`: Texto resumido (oculto cuando está expandido)
- `.disorder-full-description`: Texto completo (visible solo cuando está expandido)
- `.hover-hint`: Tooltip "Da clic para saber más"
- `.info-section`: Sección de información complementaria

### Posicionamiento Polar

Los círculos se posicionan usando transformaciones con translateX/translateY para mantener su posición incluso durante expansión:

```css
/* Ejemplo para position="0" (0°) */
.disorder-circle[data-position="0"] {
    transform: translate(-50%, -50%) translateX(280px) translateY(0px);
}

/* Hover y Expanded mantienen la misma transformación */
.disorder-circle.hovered[data-position="0"],
.disorder-circle.expanded[data-position="0"] {
    transform: translate(-50%, -50%) translateX(280px) translateY(0px);
}
```

Radio de distribución: 280px desde el centro del círculo grande.

### Diseño Responsive

La vista se adapta a diferentes tamaños de pantalla:

- **Desktop (>1024px)**: Diseño circular completo con 5 círculos posicionados interactivamente
- **Tablet (768-1024px)**: Mantiene diseño circular con ajustes de tamaño
- **Mobile (<768px)**: 
  - El círculo grande negro se oculta
  - Los 5 círculos azules se muestran verticalmente
  - Layout cambia a flexbox con `flex-direction: column`
  - Círculos mantienen funcionalidad de expansión

## Estado del Componente

**TypeScript State:**
```typescript
const [expandedDisorder, setExpandedDisorder] = useState<number | null>(null);
const [hoveredDisorder, setHoveredDisorder] = useState<number | null>(null);
```

**Estructura de datos**:
```typescript
const disorders = [
    {
        title: string,           // Título completo
        description: string,      // Descripción resumida
        fullDescription: string, // Descripción completa
        position: number         // 0-4 para posición en el círculo
    }
];
```

## Integración con el Proyecto

### Navegación
- Enlace en Header como tercera opción del menú
- Accesible mediante `<Link to="/trastornos">`

### Clases Globales Utilizadas
- `.section-title`: Para el título de la sección informativa
- `.info-card`: Para el contenedor de información complementaria

## Consideraciones de Diseño

1. **Accesibilidad**: Texto blanco sobre fondo azul cumple con contraste WCAG AA
2. **Usabilidad**: Expansión in-place evita desorientación del usuario
3. **Educativo**: Dos niveles de información (resumida y completa) permiten exploración gradual
4. **Ético**: Incluye disclaimers claros sobre las limitaciones del sistema

## Historial de Cambios

### Enero 19, 2025 - Implementación de expansión interactiva
**Cambio**: Conversión de circles estáticos a elementos interactivos con expansión in-place  
**Funcionalidad agregada**:
- Hover state con mensaje "Da clic para saber más"
- Click para expandir el círculo en su misma posición
- Descripción resumida visible siempre
- Descripción completa visible solo al expandir
- Click para contraer de vuelta

**Razón**: Mejorar la experiencia de usuario permitiendo exploración interactiva sin modales externos

## Notas Técnicas

- Utiliza flexbox para centrado de contenido
- Animaciones CSS puras sin dependencias de JavaScript
- Posicionamiento polar preservado durante todas las transformaciones
- Compatible con todos los navegadores modernos que soportan CSS3 transform
