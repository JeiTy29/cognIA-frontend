# Vista Sobre Nosotros

## Descripción general

La vista **Sobre Nosotros** es la sección institucional del sitio web de cognIA dedicada a presentar la identidad del proyecto, su equipo de desarrollo y los puntos de contacto oficiales. Esta vista humaniza la plataforma mostrando a las personas detrás del sistema y proporciona confianza institucional al vincular el proyecto con la Universidad de Cundinamarca.

## Estructura Visual y Diseño

La vista sigue una estética limpia y moderna basada en los principios de diseño de **Glassmorphism**, consistente con el resto de la aplicación (como la vista "Nuestro Sistema"). El diseño es completamente **responsive**, adaptándose fluidamente desde pantallas de escritorio hasta dispositivos móviles.

### 1. Encabezado de Sección
- **Título**: "Equipo de desarrollo"
- **Estilo**: Implementación del estándar global `.section-title` (Azul `#215F8F`, 2.2rem, subrayado) para garantizar consistencia absoluta con el resto de la plataforma.
- **Descripción**: Un bloque de texto introductorio centrado que contextualiza el propósito del equipo.

### 2. Tarjetas de Equipo (Team Grid)
El equipo se presenta en una cuadrícula de 3 columnas (en escritorio) utilizando tarjetas con las siguientes características:
- **Estética**: Fondo blanco-azulado muy sutil (`#F9FCFF`) con bordes redondeados (`20px`) y sombra suave.
- **Tipografía**:
    - Nombres en **Cyan** (`#51C2F4`, 24px) para destacar la identidad.
    - Roles en azul oscuro (`#215F8F`) para denotar jerarquía profesional.
- **Elementos Visuales**: Placeholders circulares para las fotografías de los integrantes.
- **Interacción**: Las tarjetas son estáticas para mantener la legibilidad y sobriedad.

### 3. Sección de Contacto
Una sección dedicada a la información institucional, organizada en dos grandes bloques:
- **Universidad de Cundinamarca**: Información de la sede y contacto académico.
- **Equipo cognIA**: Canales directos de comunicación con el proyecto.
- **Diseño**: Utiliza el mismo estilo de tarjetas que la sección de equipo, organizadas en una cuadrícula de 2 columnas para equilibrar la información.

## Justificación Técnica

- **Grid CSS**: Se utiliza `display: grid` para manejar los layouts complejos (3 columnas para equipo, 2 para contacto), facilitando la reestructuración en dispositivos móviles (donde pasan a 1 columna).
- **Consistencia**: Se reutilizan variables de color y estilos de sombra para asegurar que esta vista se sienta parte integral del ecosistema cognIA, compartiendo lenguaje visual con la vista "Nuestro Sistema".
- **Accesibilidad**: Los colores seleccionados (azules oscuros sobre fondos claros) garantizan un alto contraste para la lectura de información crítica.
