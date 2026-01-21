# Estilos Globales - Documentación

## Descripción general

Este documento centraliza la documentación de los cambios y decisiones de diseño relacionados con los archivos de estilos globales del proyecto: `globals.css` y `theme.css`.

## globals.css

## Fondo y Patrón de Red de Nodos Animado

### Degradado base
```css
body {
    background: linear-gradient(180deg, 
        #FFFFFF 0%,
        #EAF4FB 40%,
        #E6F1FA 70%,
        #E3F0F9 100%
    );
    background-attachment: fixed;
}
```

### Patrón de nodos animado (discreto)
```css
body::before {
    /* Configuración posicional */
    position: fixed;
    top: -50px;
    left: -50px;
    width: 400px;
    height: 400px;
    
    /* Nodos de diferentes tamaños (5-7px) */
    radial-gradient(circle at 20% 20%, rgba(33, 95, 143, 0.18) 0 6px, transparent 7px),
    /* ... 4 nodos más con opacidades 0.14-0.18 */
    
    /* Líneas conectoras diagonales */
    linear-gradient(135deg, transparent 48%, rgba(33, 95, 143, 0.08) 50%, transparent 52%),
    linear-gradient(45deg, transparent 48%, rgba(33, 95, 143, 0.08) 50%, transparent 52%);
    
    /* Animaciones */
    animation:
        networkFloat 35s ease-in-out infinite,
        networkPulse 10s ease-in-out infinite;
}
```

**Características del patrón**:
- **Esquema de red animado**: 5 nodos flotantes en esquina superior izquierda
- **Animación de flotación**: Movimiento suave de 12px horizontal y 10px vertical en 35s
- **Pulsación de opacidad**: Oscila entre 0.45 y 0.65 en 10s
- **Color**: Azul oscuro opaco (rgba(33, 95, 143)) con opacidades entre 0.14-0.18
- **Opacidad base**: 0.6 para mantener sutileza
- **Tamaño contenedor**: 400px × 400px posicionado fuera del viewport (-50px top/left)
- **Concepto**: Evoca redes neuronales con movimiento orgánico y vitalidad

### Reset CSS básico

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
```

Aplicación de reset universal para consistencia cross-browser.

### Estilos de enlaces

```css
a {
    text-decoration: none;
    color: inherit;
}
```

Elimina estilos predeterminados del navegador, permite control total desde componentes.

---

## theme.css

### Sistema de variables CSS

Define todas las variables de tema reutilizables en el proyecto.

#### Tema claro (`:root`)

```css
:root {
    --bg-main: linear-gradient(...)    /* Gradiente principal */
    --bg-header: #ffffff;               /* Fondo de header */
    
    --text-main: #2A2D34;               /* Texto principal */
    --text-secondary: #555;              /* Texto secundario */
    
    --primary: #51C2F4;                  /* Color primario de marca */
    --login-btn: #1790E9;               /* Botón login */
    --register-btn: #215F8F;            /* Botón registro */
    
    --card-bg: #ffffff;                  /* Fondo de tarjetas */
    --card-hover: #EAF6FD;              /* Hover de tarjetas */
}
```

#### Tema oscuro (`[data-theme="dark"]`)

```css
[data-theme="dark"] {
    --bg-main: #121417;                  /* Fondo oscuro principal */
    --bg-header: #1C1F26;               /* Header oscuro */
    
    --text-main: #E6E6E6;               /* Texto claro */
    --text-secondary: #A0A4B8;          /* Texto secundario claro */
    
    --primary: #6CD4FF;                  /* Primario más brillante */
    --login-btn: #1FA3FF;               
    --register-btn: #2C6EA3;            
    
    --card-bg: #1F2330;                  /* Cards oscuros */
    --card-hover: #2A2F45;              
}
```

**Nota**: El dark mode está preparado pero no implementado actualmente en la aplicación.

### Uso de variables

Cualquier componente puede usar estas variables:

```css
.component {
    background: var(--card-bg);
    color: var(--text-main);
    border-color: var(--primary);
}
```

**Ventajas**:
- Cambio de tema centralizado
- Consistencia automática en toda la aplicación
- Fácil mantenimiento
- Preparado para dark mode futuro

---

## Convenciones de estilos

### Nomenclatura de variables
- Prefijo `--` para variables CSS
- kebab-case: `--text-main`, `--card-bg`
- Nombres descriptivos del propósito, no del valor

### Orden de propiedades CSS
1. Posicionamiento (`position`, `top`, `z-index`)
2. Box model (`display`, `width`, `padding`, `margin`)
3. Tipografía (`font-family`, `font-size`, `color`)
4. Visual (`background`, `border`, `box-shadow`)
5. Animaciones (`transition`, `animation`)

### Comentarios
- Secciones delimitadas con banners ASCII
- Comentarios descriptivos antes de bloques complejos
- Explicación de valores no obvios

---

## Historial de cambios

### Enero 19, 2025 - Patrón de red animado
**Cambio**: Implementación de patrón de nodos con animaciones de flotación y pulsación  
**Archivos modificados**: `globals.css`  
**Razón**: Agregar dinamismo visual sutil que refuerce la identidad tecnológica sin distraer  
**Resultado**: Patrón flotante de 5 nodos en esquina superior izquierda con movimiento orgánico de 35s y pulsación de opacidad de 10s

### Enero 19, 2025 - Patrón de red de nodos estático (reemplazado)
**Cambio**: Adición de patrón minimalista de nodos conectados  
**Archivos modificados**: `globals.css`  
**Razón**: Añadir sutileza visual que evoque conceptos tecnológicos  
**Resultado**: Fondo con degradado + patrón de red muy sutil en azul oscuro opaco

### Enero 19, 2025 - Simplificación del fondo (revertido)
**Cambio**: Eliminación de patrones abstractos animados  
**Archivos modificados**: `globals.css`, `App.tsx`  
**Razón**: Simplificación visual y enfoque en degradado limpio  
**Resultado**: Fondo con degradado suave sin patrones decorativos

### Diciembre 15, 2024 - Sistema de fondo profesional
**Cambio**: Reemplazo completo del fondo animado por patrón técnico  
**Archivos modificados**: `globals.css`  
**Razón**: El degradado simple se percibía como un color plano sin profundidad  
**Resultado**: Fondo profesional con dot grid, mesh overlay y acentos sutiles

### Versiones anteriores
- **v1.0** (2024-12): Gradiente animado simple con círculos blur
- **v2.0** (2024-12): Patrón técnico profesional
- **v3.0** (2025-01): Degradado suave sin patrones
- **v3.1** (2025-01): Degradado con patrón de red de nodos estático
- **v3.2** (2025-01): Degradado con patrón de red animado (actual)

---

**Mantenido por**: Equipo de desarrollo cognIA  
**Última actualización**: Enero 19, 2025
