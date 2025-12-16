# Estilos Globales - Documentación

## Descripción general

Este documento centraliza la documentación de los cambios y decisiones de diseño relacionados con los archivos de estilos globales del proyecto: `globals.css` y `theme.css`.

## globals.css

## Fondo y Patrón Decorativo 

```css
body::before {
    background-image:
        radial-gradient(circle at 50% 50%, transparent 30%, rgba(81, 194, 244, 0.08) 30%, ...),
        radial-gradient(circle at 0% 50%, ...),
        radial-gradient(circle at 100% 50%, ...);
    background-size: 100px 87px;
    opacity: 0.8;
}
```
```css
body::after {
    background-image:
        radial-gradient(circle, transparent 60px, rgba(81, 194, 244, 0.06) 60px, ...),
        radial-gradient(circle, transparent 100px, rgba(81, 194, 244, 0.08) 100px, ...),
        radial-gradient(circle, transparent 140px, rgba(81, 194, 244, 0.10) 140px, ...),
        radial-gradient(circle, transparent 180px, rgba(81, 194, 244, 0.06) 180px, ...);
}
```

- **4 círculos concéntricos** con diferentes radios (60px, 100px, 140px, 180px)
- **Opacidades variables** (6%, 8%, 10%, 6%) para crear profundidad visual
- **Posición**: Esquina inferior izquierda con overflow

### Optimización responsive

```css
@media (max-width: 768px) {
    body::before {
        width: 400px;
        height: 400px;
        background-size: 70px 61px; /* Hexágonos más pequeños */
    }
    body::after {
        width: 350px;
        height: 350px;
    }
}

@media (max-width: 480px) {
    body::before {
        width: 300px;
        height: 300px;
        background-size: 50px 43.5px;
    }
    body::after {
        width: 250px;
        height: 250px;
    }
}
```

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

### Diciembre 15, 2024 - Sistema de fondo profesional
**Cambio**: Reemplazo completo del fondo animado por patrón técnico  
**Archivos modificados**: `globals.css`  
**Razón**: El degradado simple se percibía como un color plano sin profundidad  
**Resultado**: Fondo profesional con dot grid, mesh overlay y acentos sutiles

### Versiones anteriores
- **v1.0** (2024-12): Gradiente animado simple con círculos blur
- **v2.0** (2024-12): Patrón técnico profesional (actual)

---

**Mantenido por**: Equipo de desarrollo cognIA  
**Última actualización**: Diciembre 15, 2024
