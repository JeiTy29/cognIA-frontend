# Vista Nuestro Sistema

## Descripción general

La vista **Nuestro Sistema** es una sección informativa del sitio web de cognIA que explica de manera visual e interactiva el funcionamiento del sistema de evaluación basado en Random Forest. La vista se compone de dos partes principales:

1. **Proceso de Evaluación en 4 Etapas**: Presenta de forma visual las cuatro fases del proceso (Observar, Cuestionar, Votar, Sugerir) mediante tarjetas con iconos SVG personalizados.

2. **Demostración Interactiva de Random Forest**: Componente demostrativo que permite al usuario seleccionar entre diferentes preguntas de ejemplo para observar cómo múltiples árboles de decisión votan y generan una clasificación final.

## Justificación

## Justificación

Se optó por un diseño moderno con efectos de **glassmorphism** (transparencias con blur) para integración visual con el fondo técnico de la página. Las tarjetas semi-transparentes crean una experiencia visual sofisticada y moderna. Los títulos principales siguen rigurosamente el estándar global de la aplicación (Clase `.section-title`: Azul Oscuro, 2.2rem) para mantener una identidad visual unificada frente a la sección "Sobre Nosotros". 

Las preguntas de la demostración interactiva  se diseñaron para ser:

- **Intuitivas**: Ejemplos cotidianos fáciles de comprender (clasificación de emails, predicción del clima, análisis de clientes)
- **Neutrales**: No relacionadas directamente con el dominio médico para evitar sensibilidad
- **Informativas**: Ilustran claramente el concepto de clasificación binaria y votación mayoritaria

## Funcionamiento

### Estructura de las Tarjetas del Proceso

Cada tarjeta del proceso incluye un icono SVG, título numerado y descripción breve. Las tarjetas implementan efectos hover que incluyen elevación, cambio de sombras y bordes, y animación de iconos.

### Demostración Random Forest

**Estado del Componente**:
El componente utiliza React hooks para gestionar tres estados principales:
- `selectedQuestion`: ID de la pregunta actualmente seleccionada
- `isAnimating`: Indicador booleano de animación en progreso
- `showResult`: Control de visualización del resultado final

**Flujo de Interacción**:
1. El usuario selecciona una pregunta mediante botones
2. Se activa el estado de animación
3. Los 5 árboles de decisión aparecen secuencialmente con animación escalonada (delay de 0.3s)
4. Cada árbol muestra su voto individual (Sí/No) con colores distintivos
5. Después de 2.5 segundos, se muestra el resultado final con animación fade-in

## Interacción con el usuario

### Tarjetas del Proceso

Los usuarios pueden explorar visualmente las 4 etapas del sistema:
- **Hover**: Al pasar el cursor, las tarjetas se elevan y los iconos rotan sutilmente
- **Lectura secuencial**: La numeración guía al usuario a través del flujo lógico
- **Comprensión rápida**: Iconos + texto breve permiten asimilar el proceso en segundos

### Simulación Interactiva

**Antes de interactuar**:
- El usuario ve el título "Simulación Interactiva"
- Un disclaimer naranja advierte que es una demostración simplificada
- Se presentan 3 botones con preguntas de ejemplo
- Instrucción clara: "Selecciona una pregunta para ver cómo votan los árboles"

**Durante la interacción**:
1. Al hacer clic en una pregunta, el botón se destaca con gradiente azul brillante
2. Los botones restantes se deshabilitan temporalmente (opacity reducida)
3. Los árboles aparecen uno por uno con animación de rebote
4. Cada árbol muestra claramente su voto con badges de colores
5. Feedback visual continuo mantiene al usuario informado del progreso

**Después de la votación**:
- Aparece un banner destacado con el resultado final
- El resultado incluye contexto ("Clasificación:", "Predicción:")
- Los usuarios pueden seleccionar otra pregunta para repetir la experiencia

### Layout Responsivo de Dos Columnas

La sección Random Forest utiliza un grid de dos columnas:
- **Columna izquierda (40%)**: Información educativa sobre Random Forest
  - Explicación del algoritmo
  - Descripción del proceso de votación
  - Lista de ventajas con checkmarks
- **Columna derecha (60%)**: Área interactiva
  - Selector de preguntas
  - Visualización de árboles votando
  - Resultado final

## Consideraciones de diseño

### Usabilidad

- **Estados claros**: Los botones tienen estados visuales distintos (normal, hover, active, disabled)
- **Feedback inmediato**: Cada acción del usuario genera una respuesta visual instantánea
- **Prevención de errores**: Los botones se deshabilitan durante las animaciones para evitar estados inconsistentes
- **Jerarquía visual**: Uso de tamaños de fuente, pesos y colores para guiar la atención

### Accesibilidad

- **Contraste adecuado**: Todos los textos sobre fondos semi-transparentes mantienen ratio de contraste suficiente
- **Iconos + texto**: Los iconos SVG siempre van acompañados de texto descriptivo
- **Colores semánticos**: Uso de azul para positivo y naranja para negativo (en lugar de verde/rojo para evitar problemas de daltonismo severo)
- **Animaciones controladas**: Las animaciones son suaves (15s para gradient) y no parpadean, evitando problemas de accesibilidad

### Experiencia de Usuario

- **Carga cognitiva reducida**: Información presentada en chunks pequeños y digeribles
- **Educación progresiva**: Se explica el concepto antes de permitir la interacción
- **Gratificación instantánea**: Las animaciones son lo suficientemente rápidas (2.5s) para mantener el interés sin aburrir
- **Estética consistente**: Todos los elementos siguen la paleta de colores y estilo de cognIA

## Estado actual

La vista está completamente implementada y funcional con diseño responsive, glassmorphism, componente interactivo de Random Forest con animaciones, e iconos SVG personalizados.
