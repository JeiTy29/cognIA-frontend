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
3. TDAH (Trastorno por Déficit de Atención e Hiperactividad)
4. Trastorno de eliminación
5. Trastorno de conducta

**Descripción** (14px, color blanco):
- Explicación clara y accesible del trastorno
- Orientada a un público general sin conocimientos técnicos
- Enfoque en síntomas observables en niños

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
- `.large-circle`: Círculo grande con borde negro
- `.disorder-circle`: Círculos individuales de trastornos con:
  - Posicionamiento absoluto calculado mediante trigonometría
  - Atributo `data-position` (0-4) para determinar ubicación
  - Efecto hover con `scale(1.05)`
- `.info-section`: Sección de información complementaria

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

- **Desktop (>1024px)**: Diseño completo con círculos de 240px
- **Tablet (768-1024px)**: Círculos reducidos a 200px, círculo principal a 500px
- **Mobile (600-768px)**: Círculos de 160px, diseño compacto
- **Small Mobile (<480px)**: Círculos de 110px, fuentes más pequeñas

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
