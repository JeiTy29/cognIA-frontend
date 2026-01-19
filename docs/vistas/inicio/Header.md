# Header

## Descripción

El Header es el componente de navegación principal del aplicativo cognIA. Se muestra en la parte superior de todas las páginas y proporciona acceso rápido a las secciones principales del sistema, así como opciones de autenticación.

## Ubicación

**Ruta**: `src/components/Header/`

**Archivos**:
- `Header.tsx` - Componente React
- `Header.css` - Estilos del header

## Características

### Diseño visual

- **Efecto glassmorphism**: Fondo semitransparente con desenfoque
- **Posicionamiento**: Fixed o sticky en la parte superior
- **z-index**: 10 para mantenerse sobre el contenido
- **Layout**: Flexbox con distribución horizontal

### Contenido

El header se divide en tres secciones principales:

1. **Logo**: "cognIA" - Identidad de marca en el lado izquierdo

2. **Navegación central**:
   - Nuestro Sistema (activo por defecto)
   - Sobre Nosotros
   - Trastornos

3. **Botones de autenticación** (lado derecho):
   - Iniciar sesión
   - Registrarse

## Implementación

### Estructura del componente

```tsx
import './Header.css';

export default function Header() {
    return (
        <header className="header">
            <div className="logo">cognIA</div>
            
            <nav className="nav">
                <span className="active">Nuestro Sistema</span>
                <span>Sobre Nosotros</span>
                <span>Trastornos</span>
            </nav>
            
            <div className="auth-buttons">
                <button className="login">Iniciar sesión</button>
                <button className="register">Registrarse</button>
            </div>
        </header>
    );
}
```

## Estilos

### Responsive

El header se adapta a diferentes tamaños de pantalla:

**Desktop** (> 768px):
- Distribución horizontal completa
- Todos los elementos visibles

**Tablet/Mobile** (≤ 768px):
- Layout reorganizado con flex-wrap
- Navegación se reposiciona para ocupar el ancho completo
- Elementos apilados verticalmente cuando es necesario

### Glassmorphism

El header utiliza el efecto de vidrio esmerilado:
- Fondo semitransparente con blur
- Borde sutil con color primario
- Se integra visualmente con el fondo de la página

### Navegación activa

La pestaña activa tiene:
- Indicador visual diferenciado
- Underline animado (si está implementado)
- Color destacado

## Interactividad

- **Hover en navegación**: Efectos visuales al pasar el cursor
- **Hover en botones**: Cambios de color y elevación
- **Transiciones suaves**: Todos los estados tienen animaciones fluidas
- **Touch-friendly**: Áreas de toque apropiadas para dispositivos móviles (mínimo 44x44px)

## Notas de diseño

- El header mantiene visibilidad sobre el contenido con z-index elevado
- El glassmorphism proporciona un look moderno sin sacrificar legibilidad
- La navegación responsive asegura usabilidad en todos los dispositivos
- Los colores y espaciado siguen las variables del sistema de diseño definidas en `theme.css`
