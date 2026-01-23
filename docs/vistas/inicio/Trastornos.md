# Vista: Trastornos

## Descripcion general

La vista **Trastornos** presenta informacion educativa sobre cinco trastornos psicologicos infantiles. El foco visual es el **Grafico de trastornos**, compuesto por un circulo central negro y cinco circulos azules interactivos.

## Ubicacion

- **Ruta del archivo**: `src/pages/Inicio/Trastornos/Trastornos.tsx`
- **Archivo de estilos**: `src/pages/Inicio/Trastornos/Trastornos.css`
- **Ruta de navegacion**: `/trastornos`

## Arquitectura visual

### Titulo

- El titulo utiliza la clase global `.section-title` para mantener coherencia con otras vistas.
- Esta centrado y la linea inferior es ligeramente mas larga que el texto.

### Texto de ayuda

- Mensaje guia con fondo, borde y sombra.
- Ubicado cerca del titulo para reforzar la accion.
- El `z-index` evita que el grafico lo tape.

### Grafico de trastornos

**Estado base**:
- Grafico centrado debajo del titulo.
- Circulo negro central y cinco circulos azules alrededor.
- Cada circulo muestra icono y titulo.

**Estado expandido**:
- El circulo seleccionado se desplaza hacia la derecha y crece.
- El grafico completo se desplaza suavemente a la izquierda.
- El circulo expandido mantiene la sensacion de transformacion desde el original.

**Comportamiento**:
- Clic fuera del grafico cierra el estado expandido.
- Clic en otro trastorno intercambia el expandido con transicion fluida.

## Iconos

- Los iconos se cargan desde `src/assets/Iconos/Trastornos/`.
- Se renderizan sin fondo ni sombras para mantener transparencia visual.
- Archivos actuales:
  - `Ansiedad.png`
  - `Depresion.png`
  - `TDAH.png`
  - `Trastorno de Conducta.png`
  - `Trastorno de Eliminacion.png`

## Estilos principales

- `.circle-diagram-wrapper.is-expanded`: mueve el grafico a la izquierda.
- `.disorder-circle.expanded`: expande y desplaza el circulo seleccionado.
- `.disorder-icon`: iconos con fondo transparente y `object-fit: contain`.

## Espaciado

- Reduccion de espacios entre titulo, texto guia y grafico.
- Margen inferior menor entre grafico y bloque informativo.

## Responsive

- **Desktop**: grafico circular completo con expansion lateral.
- **Tablet**: tamanos reducidos, mantiene desplazamiento lateral.
- **Mobile**:
  - Se oculta el circulo negro.
  - Los circulos se apilan verticalmente.
  - La descripcion se muestra sin expansion.

## Historial de cambios

### Enero 2026 - Ajustes de grafico y titulo

- Titulo alineado al estilo global y centrado.
- Texto guia cercano al titulo y con mayor presencia.
- Animacion de expansion mas fluida, evitando saltos al centro.
- Iconos transparentes con rutas correctas.
