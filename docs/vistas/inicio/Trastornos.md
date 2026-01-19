# Vista: Trastornos

## Descripción General

La vista **Trastornos** presenta información educativa sobre los cinco trastornos psicológicos infantiles que el sistema cognIA está diseñado para identificar. Utiliza un diseño visual único basado en círculos para mostrar de manera clara y accesible cada trastorno.

## Estructura del Componente

### Ubicación
- **Ruta del archivo**: `src/pages/Inicio/Trastornos/Trastornos.tsx`
- **Archivo de estilos**: `src/pages/Inicio/Trastornos/Trastornos.css`
- **Ruta de navegación**: `/trastornos`

### Arquitectura Visual

#### Diagrama Circular de Trastornos

La vista presenta un diseño innovador con:

1. **Círculo Grande Central**: 
   - Borde negro de 3px
   - Solo contorno, sin relleno
   - Diámetro de 600px (responsive en dispositivos móviles)
   - Actúa como contenedor visual para los círculos de trastornos

2. **Cinco Círculos de Trastornos**:
   - Posicionados sobre el contorno del círculo grande utilizando coordenadas polares
   - Espaciados uniformemente a 72° de separación
   - Fondo azul claro (#51C2F4)
   - Texto blanco para alto contraste
   - Dimensiones: 240px de ancho, altura mínima de 200px

#### Trastornos Presentados

Cada círculo contiene:

**Título del trastorno** (24px, font-weight 700, color blanco):
1. Ansiedad
2. Depresión
3. TDAH
4. Trastorno de eliminación
5. Trastorno de conducta

**Descripción** (14px, color blanco):
- Explicación clara y accesible del trastorno
- Orientada a un público general sin conocimientos técnicos
- Enfoque en síntomas observables en niños

**Nota:** El título de TDAH se acortó para mejorar el ajuste dentro del círculo.

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
- `.large-circle`: Círculo grande con borde negro (600px × 600px con aspect-ratio 1:1 para círculo perfecto)
- `.disorder-circle`: Círculos individuales de trastornos (220px × 220px con aspect-ratio 1:1):
  - Posicionamiento absoluto calculado mediante trigonometría
  - Atributo `data-position` (0-4) para determinar ubicación
  - Efecto hover con `scale(1.05)`
- `.info-section`: Sección de información complementaria

### Círculos Perfectos

Los círculos utilizan `aspect-ratio: 1` para garantizar proporciones perfectas:

```css
.large-circle {
    width: 600px;
    height: 600px;
    aspect-ratio: 1;
    border-radius: 50%;
}

.disorder-circle {
    width: 220px;
    height: 220px;
    aspect-ratio: 1;
    border-radius: 50%;
}
```

### Posicionamiento Polar

Los círculos se posicionan usando cálculos trigonométricos:

```css
/* Ejemplo para position="1" (72°) */
top: calc(50% - 285px * 0.951);
left: calc(50% + 285px * 0.309);
```

Donde 285px es el radio del círculo grande (300px de radio - 120px de radio del círculo pequeño).

### Diseño Responsive

La vista se adapta a diferentes tamaños de pantalla:

- **Desktop (>1024px)**: Diseño circular completo con 5 círculos posicionados alrededor del círculo grande
- **Tablet (768-1024px)**: Mantiene diseño circular con ajustes de tamaño
- **Mobile (<768px)**: 
  - **Cambio fundamental**: El círculo grande negro se oculta completamente
  - Los 5 círculos azules se muestran verticalmente en una columna
  - Posicionamiento absoluto se convierte en estático (position: static)
  - Layout cambia a flexbox con `flex-direction: column`
  - Cada círculo mantiene su fondo azul y texto blanco
  - No se requiere aspect-ratio en mobile (permite altura automática)
  - Máximo ancho de 400px por círculo para mejor legibilidad

## Integración con el Proyecto

### Navegación
- Enlace en Header como tercera opción del menú
- Accesible mediante `<Link to="/trastornos">`

### Clases Globales Utilizadas
- `.section-title`: Para el título de la sección informativa
- `.info-card`: Para el contenedor de información complementaria

## Consideraciones de Diseño

1. **Accesibilidad**: Texto blanco sobre fondo azul cumple con contraste WCAG AA
2. **Usabilidad**: Diagrama circular facilita la visualización de todos los trastornos simultáneamente
3. **Educativo**: Descripciones simples y directas apropiadas para padres y educadores
4. **Ético**: Incluye disclaimers claros sobre las limitaciones del sistema y la necesidad de consultar profesionales

## Mantenimiento

Para actualizar la información de trastornos, modificar el array `disorders` en `Trastornos.tsx`:

```typescript
const disorders = [
    {
        title: "Nombre del Trastorno",
        description: "Descripción clara y concisa",
        position: 0 // 0-4 para posición en el círculo
    },
    // ...
];
```

## Notas Técnicas

- Utiliza flexbox para centrado de contenido en los círculos
- Animación de hover para mejorar interactividad
- Posicionamiento CSS puro sin dependencias de JavaScript para renderizado
- Compatible con todos los navegadores modernos que soportan CSS3 calc()
