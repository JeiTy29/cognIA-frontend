# Footer

## Descripción

El Footer es un componente global que aparece en la parte inferior de todas las páginas del aplicativo cognIA. Proporciona información de copyright y enlaces a documentos legales importantes.

## Ubicación

**Ruta**: `src/components/Footer/`

**Archivos**:
- `Footer.tsx` - Componente React
- `Footer.css` - Estilos del footer

## Características

### Diseño visual

- **Fondo**: Negro (#000000)
- **Texto**: Blanco (#ffffff), coincide con el color del fondo principal de la aplicación
- **Layout**: Flexbox con distribución horizontal
- **Responsive**: Se adapta a móviles cambiando a layout vertical

### Contenido

1. **Texto de copyright**: "© 2025 cognIA - Universidad de Cundinamarca"
2. **Enlaces legales**:
   - Políticas de privacidad
   - Términos de uso

## Implementación

### Estructura del componente

```tsx
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer-content">
                <p className="footer-copyright">
                    © 2025 cognIA - Universidad de Cundinamarca
                </p>
                <div className="footer-links">
                    <Link to="/politicas-privacidad">Políticas de privacidad</Link>
                    <Link to="/terminos-uso">Términos de uso</Link>
                </div>
            </div>
        </footer>
    );
}
```

### Navegación

Los enlaces del footer utilizan React Router para navegar a:
- `/politicas-privacidad` → Vista de Políticas de Privacidad
- `/terminos-uso` → Vista de Términos de Uso

## Estilos

### Responsive

El footer implementa un diseño responsive:

**Desktop** (> 768px):
- Contenido distribuido horizontalmente
- Copyright a la izquierda, enlaces a la derecha

**Mobile** (≤ 768px):
- Contenido apilado verticalmente
- Texto centrado
- Enlaces en columna con menor espaciado

### Interactividad

- **Hover**: Los enlaces reducen su opacidad a 0.7 y muestran subrayado
- **Transiciones**: Animación suave de 0.3s en el efecto hover

## Uso

El Footer debe incluirse en el layout principal de la aplicación para que aparezca en todas las páginas:

```tsx
<App>
  <Header />
  <main>{/* Contenido de la página */}</main>
  <Footer />
</App>
```

## Notas de diseño

- El color negro del footer contrasta con el fondo blanco de las páginas
- Los enlaces mantienen la accesibilidad con buen contraste de colores
- El diseño minimalista mantiene el foco en el contenido principal
