# Arquitectura del Frontend

## Descripción general

El frontend del aplicativo web cognIA se desarrolla como una Single Page Application (SPA) utilizando la biblioteca React junto con el lenguaje TypeScript. Este enfoque permite construir interfaces dinámicas, modulares y mantenibles, mejorando la experiencia del usuario y facilitando el desarrollo incremental del sistema.

La arquitectura del frontend sigue un patrón modular basado en componentes React con TypeScript, implementando una separación clara de responsabilidades y un sistema de estilos centralizado. El proyecto está diseñado para ser escalable, mantenible y completamente responsive.

## Capas funcionales

Desde el punto de vista arquitectónico, el frontend se organiza en las siguientes capas funcionales:

- **Capa de presentación**: Compuesta por páginas y componentes visuales responsables de la interacción con el usuario
- **Capa de navegación**: Encargada del manejo de rutas y vistas del sistema
- **Capa de estado**: Orientada a la gestión de información compartida entre componentes
- **Capa de servicios**: Destinada a la comunicación con el backend del sistema

Con esta arquitectura se favorece la separación de responsabilidades, reduce el acoplamiento entre módulos y permite la escalabilidad del sistema a futuro.

## Estructura de carpetas

```
cognIA-frontend/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── Header/          # Header de navegación
│   │   │   ├── Header.tsx
│   │   │   └── Header.css
│   │   └── Footer/          # Footer global
│   │       ├── Footer.tsx
│   │       └── Footer.css
│   ├── pages/               # Páginas/vistas principales
│   │   └── Inicio/
│   │       ├── NuestroSistema/
│   │       │   ├── NuestroSistema.tsx
│   │       │   └── NuestroSistema.css
│   │       ├── Privacy/
│   │       │   ├── Privacy.tsx
│   │       │   └── Privacy.css
│   │       └── Terms/
│   │           ├── Terms.tsx
│   │           └── Terms.css
│   ├── styles/              # Estilos globales y sistema de diseño
│   │   ├── theme.css        # Variables de tema (colores, fondos)
│   │   └── globals.css      # Estilos base y reset
│   ├── context/             # Contextos de React (estado global)
│   ├── hooks/               # Custom hooks reutilizables
│   ├── services/            # Lógica de API y servicios externos
│   ├── utils/               # Funciones utilitarias
│   ├── layouts/             # Componentes de layout
│   ├── assets/              # Recursos estáticos (imágenes, iconos)
│   ├── App.tsx              # Componente raíz
│   └── main.tsx             # Punto de entrada de la aplicación
├── docs/                    # Documentación del proyecto
│   ├── vistas/              # Documentación de vistas/componentes
│   │   ├── estilos.md       # Documentación de estilos globales
│   │   └── inicio/
│   │       ├── Footer.md
│   │       ├── Header.md
│   │       ├── PoliticasDePrivacidad.md
│   │       ├── TerminosDeUso.md
│   │       └── 02-NuestroSistema.md
│   └── proyecto/            # Documentación general del proyecto
│       └── 03-ArquitecturaFrontend.md
└── public/                  # Archivos públicos estáticos
```

## Patrón de componentes

### Organización por carpetas

Cada componente sigue la estructura:
```
ComponentName/
├── ComponentName.tsx        # Lógica y estructura JSX
└── ComponentName.css        # Estilos específicos del componente
```

### Principios de diseño de componentes

1. **Un componente, una responsabilidad**: Cada componente se enfoca en una funcionalidad específica
2. **Componentes funcionales**: Uso de React Hooks en lugar de clases
3. **Tipado estricto**: TypeScript para type safety y mejor experiencia de desarrollo
4. **Estilos en cascada**: CSS modules o archivos separados para evitar conflictos
5. **Reutilización**: Los componentes en `/components` son reutilizables en múltiples vistas

### Ejemplo: Estructura de componente

```tsx
// ComponentName.tsx
import './ComponentName.css';
import { useState } from 'react';

export default function ComponentName() {
  const [state, setState] = useState<Type>(initialValue);
  
  // Lógica del componente
  
  return (
    <div className="component-name">
      {/* JSX */}
    </div>
  );
}
```

```css
/* ComponentName.css */
.component-name {
  /* Estilos base */
}

/* Media queries al final */
@media (max-width: 768px) {
  /* Estilos responsive */
}
```

## Sistema de estilos

### Variables de tema (theme.css)

Define todas las variables CSS custom properties para colores y estilos reutilizables:

```css
:root {
  /* Tema claro */
  --bg-main: /* Gradiente de fondo principal */
  --primary: #51C2F4;     /* Color primario de marca */
  --text-main: #2A2D34;   /* Color de texto principal */
  --card-bg: #ffffff;      /* Fondo de tarjetas */
  /* ... más variables */
}

[data-theme="dark"] {
  /* Variables para tema oscuro */
}
```

**Ventajas del sistema de variables**:
- Cambio de tema centralizado
- Consistencia visual automática
- Fácil implementación de dark mode
- Mejor mantenibilidad

### Estilos globales (globals.css)

Contiene reset CSS básico, estilos del body con fondo técnico de patrón de puntos, y optimizaciones responsive del fondo.

**Detalles completos**: Ver `docs/vistas/estilos.md`

### Patrón de glassmorphism

Los componentes utilizan un efecto de glassmorphism (vidrio esmerilado) para una estética moderna que se integra con el fondo técnico de la página:

```css
.component {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(81, 194, 244, 0.2);
}
```

## Estrategia responsive

### Breakpoints definidos

El proyecto utiliza un sistema de breakpoints mobile-first:

| Breakpoint | Ancho máximo | Dispositivos objetivo |
|------------|--------------|----------------------|
| Desktop    | > 1024px     | Monitores grandes, laptops |
| Tablet     | 1024px       | Tablets, laptops pequeñas |
| Mobile     | 768px        | Tablets portrait, móviles landscape |
| Small Mobile | 480px      | Smartphones portrait |
| Extra Small | 360px       | Smartphones pequeños |

### Implementación responsive

#### 1. Layouts flexibles

**Grid adaptativo** (NuestroSistema cards):
```css
.cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);  /* Desktop: 4 columnas */
  gap: 28px;
}

@media (max-width: 1024px) {
  .cards {
    grid-template-columns: repeat(2, 1fr);  /* Tablet: 2 columnas */
  }
}

@media (max-width: 768px) {
  .cards {
    grid-template-columns: 1fr;  /* Mobile: 1 columna */
  }
}
```

**Flexbox responsive** (Header):
```css
.header {
  display: flex;
  justify-content: space-between;
}

@media (max-width: 768px) {
  .header {
    flex-wrap: wrap;  /* Elementos se reorganizan */
    gap: 16px;
  }
  
  .nav {
    order: 3;         /* Navegación al final */
    width: 100%;
    justify-content: center;
  }
}
```

#### 2. Tipografía escalable

Los tamaños de fuente se reducen progresivamente:

```css
.sistema h1 {
  font-size: 32px;  /* Desktop */
}

@media (max-width: 768px) {
  .sistema h1 {
    font-size: 28px;  /* Tablet */
  }
}

@media (max-width: 480px) {
  .sistema h1 {
    font-size: 24px;  /* Mobile */
  }
}
```

#### 3. Espaciado adaptativo

Padding y margins se ajustan según el tamaño de pantalla:

```css
.sistema {
  padding: 80px;  /* Desktop: amplio */
}

@media (max-width: 768px) {
  .sistema {
    padding: 50px 24px;  /* Tablet: reducido */
  }
}

@media (max-width: 480px) {
  .sistema {
    padding: 40px 16px;  /* Mobile: mínimo */
  }
}
```

#### 4. Componentes interactivos optimizados

**Reducción de efectos hover en móviles**:
```css
.card:hover {
  transform: translateY(-12px) scale(1.02);  /* Desktop: efecto pronunciado */
}

@media (max-width: 480px) {
  .card:hover {
    transform: translateY(-4px) scale(1.01);  /* Mobile: sutil */
  }
}
```

**Botones touch-friendly**:
- Tamaño mínimo de 44x44px en móviles
- Espaciado entre elementos táctiles
- Areas de clic expandidas

**Animaciones optimizadas**:
- Uso de `transform` y `opacity` (hardware accelerated)
- Patrones de fondo optimizados para móviles
- Animaciones más rápidas en dispositivos pequeños

**Optimización de fondos**: Ver `docs/vistas/estilos.md` para detalles sobre optimización de patrones en diferentes dispositivos.

### Principios responsive aplicados

1. **Mobile-first mindset**: Diseño base optimizado para móviles, enriquecido para desktop
2. **Contenido prioritario**: El contenido esencial siempre visible en todas las resoluciones
3. **Toque amigable**: Elementos interactivos con tamaño mínimo de 44x44px
4. **Performance consciente**: Reducciones graduales de efectos visuales costosos
5. **Legibilidad**: Tamaños de fuente nunca menores a 13px
6. **Sin scroll horizontal**: `overflow-x: hidden` en body

## Sistema de navegación

### Estructura actual

```
Header (global)
└── Navigation
    ├── Nuestro Sistema
    ├── Sobre Nosotros  
    └── Trastornos

Footer (global)
└── Legal Links
    ├── Políticas de privacidad
    └── Términos de uso
```

El header utiliza:
- **Glassmorphism** para integración visual
- **z-index: 10** para posicionamiento sobre contenido
- **Navegación responsive** que se reorganiza en móviles
- **Underline animado** para indicador de pestaña activa

El footer utiliza:
- **Fondo negro** con texto blanco
- **Layout flexible** que se adapta a móviles
- **Enlaces a documentos legales** (Privacy y Terms)

## Estado global (Context API)

Aunque no está actualmente implementado en los componentes visibles, el proyecto tiene una carpeta `/context` preparada para:

- **ThemeContext**: Cambio entre tema claro y oscuro
- **AuthContext**: Estado de autenticación del usuario
- **Otros contextos**: Según necesidades futuras

## Patrones de código

### Nomenclatura

- **Componentes**: PascalCase (`Header`, `NuestroSistema`, `Footer`)
- **Archivos**: Mismo nombre que el componente
- **CSS classes**: kebab-case (`.sistema`, `.footer-content`)
- **Variables CSS**: kebab-case con prefijo (`--bg-main`, `--primary`)

### Hooks personalizados

Ubicados en `/hooks`, siguen el patrón:
```typescript
export function useCustomHook() {
  // Lógica del hook
  return { data, methods };
}
```

### Gestión de servicios

Ubicados en `/services`, encapsulan lógica de API:
```typescript
export const apiService = {
  async fetchData() {
    // Llamada a API
  }
};
```

## Estrategia de pruebas (futuro)

Estructura propuesta para testing:
```
src/
├── components/
│   └── Header/
│       ├── Header.tsx
│       ├── Header.css
│       └── Header.test.tsx    # Tests unitarios
```

## Ventajas de esta arquitectura

1. **Modularidad**: Componentes independientes y reutilizables
2. **Escalabilidad**: Fácil agregar nuevas vistas y componentes
3. **Mantenibilidad**: Separación clara de responsabilidades
4. **Responsive por diseño**: Media queries consistentes en todos los componentes
5. **Performance optimizada**: Técnicas de optimización específicas por dispositivo
6. **Desarrollo eficiente**: TypeScript + estructura clara = menos bugs
7. **Experiencia premium**: Glassmorphism y animaciones modernas

## Convenciones de desarrollo

### Agregar un nuevo componente

1. Crear carpeta en `/components` o `/pages`
2. Crear archivos `.tsx` y `.css`
3. Implementar lógica con TypeScript
4. Aplicar estilos con variables del theme
5. Agregar media queries responsive
6. Documentar en `/docs/vistas` si es necesario

### Agregar una nueva vista

1. Crear carpeta en `/pages`
2. Seguir misma estructura que NuestroSistema
3. Reutilizar componentes de `/components`
4. Mantener consistencia con theme.css
5. Implementar responsive desde el inicio

### Modificar el tema visual

1. Editar variables en `theme.css`
2. Los cambios se propagan automáticamente
3. Probar en light y dark theme (si aplica)

## Stack tecnológico

- **Framework**: React 18+ con TypeScript
- **Build tool**: Vite
- **Estilos**: CSS puro con CSS Custom Properties
- **Routing**: React Router (preparado en AppRouter.tsx)
- **Estado**: React Hooks + Context API
- **Iconos**: SVG inline (Material Design icons)

**Versión de documentación**: 2.0  
**Última actualización**: Diciembre 17, 2024  
**Mantenido por**: Equipo de desarrollo cognIA
