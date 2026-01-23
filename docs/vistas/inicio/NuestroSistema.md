# Vista: Nuestro Sistema

## Descripción general

Explica el flujo de evaluación en cuatro etapas y muestra una simulación interactiva del algoritmo Random Forest.

## Ubicación

- Componente: `src/pages/Inicio/NuestroSistema/NuestroSistema.tsx`
- Estilos: `src/pages/Inicio/NuestroSistema/NuestroSistema.css`
- Ruta: `/`

## Estructura

1. **Título principal** `.section-title` y texto introductorio `.intro`.
2. **Cards de etapas** (`.cards`): 4 tarjetas con ícono SVG, numeración y descripción.
3. **Sección Random Forest** (`.rf-demo`):
   - Columna izquierda (`.rf-description.info-card`).
   - Columna derecha (`.rf-interactive.info-card`).

## Estados y lógica (TypeScript)

- `selectedQuestion: number | null` → pregunta activa.
- `isAnimating: boolean` → bloquea botones durante animación.
- `showResult: boolean` → muestra resultado final al terminar.

Flujo al hacer clic en una pregunta:
1. Se asigna `selectedQuestion`.
2. Se activa `isAnimating` y se oculta resultado.
3. Después de **2500ms**, se muestra el resultado y se apaga la animación.

## Simulación Random Forest

- Botones `.question-btn` se deshabilitan cuando `isAnimating` es `true`.
- Cada árbol se renderiza con clase `.tree` y `animationDelay` escalonado.
- Voto “Sí/No” se marca con `.vote.positive` o `.vote.negative`.
- El arreglo `questions` incluye **3 preguntas demo** y **5 votos** por árbol.

## Estilos clave

- Tarjetas con gradiente suave y hover (elevación + cambio de borde).
- Íconos en cajas **80x80** con fondo azul translúcido.
- Flechas entre tarjetas (`.flow-arrow`) con color **#51C2F4**.
- Secciones informativas usan `.info-card` global.

## Animaciones

- `treeVote`: entrada de cada árbol (0.5s–0.6s).
- `fadeIn`: aparición del resultado final.

## Clases CSS clave

- `.card`, `.icon`, `.flow-arrow`, `.question-btn`, `.forest`, `.tree`, `.result`.

## Responsive

- `max-width: 1024px`: flechas se ocultan y cards se distribuyen en 2 columnas.
- `max-width: 768px`: cards en columna, tipografías reducidas.
- `max-width: 480px`: padding y tamaños compactos.

## Flujo de usuario

1. Lee las 4 etapas del sistema.
2. En la sección Random Forest, selecciona una pregunta.
3. Observa la animación de votos y el resultado final.
