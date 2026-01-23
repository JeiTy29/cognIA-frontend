# Estilos Globales - Documentacion

## Descripcion general

Documento central de estilos globales para `globals.css` y `theme.css`.

## globals.css

### Fondo organico animado

Se mantiene el fondo organico con manchas suaves en movimiento, con contraste ajustado para que el desplazamiento sea visible sin distraer.

### Titulos de seccion

Se actualizo el estilo global `.section-title` para que quede centrado y con una linea inferior ligeramente mas larga que el texto.

```css
.section-title {
    display: inline-flex;
    align-items: center;
    text-align: center;
    margin-left: auto;
    margin-right: auto;
}

.section-title::after {
    width: calc(100% + 12px);
    transform: translateX(-6px);
}
```

## Convenciones

- Variables en kebab-case.
- Comentarios con separadores ASCII.
- Orden recomendado: layout → tipografia → visual → animaciones.

## Historial de cambios

### Enero 2026 - Ajuste global de titulos
**Cambio**: centrado y subrayado mas largo en `.section-title`.  
**Archivos**: `globals.css`.  
**Razon**: unificar el estilo de titulos entre vistas.
