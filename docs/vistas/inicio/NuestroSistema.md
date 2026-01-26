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
3. **Bloque "¿Para quien va dirigido?"** (`.audience-section`):
- Un panel principal con tabs centrados (`.audience-panel`, `.role-tabs`).
   - Cuatro círculos por rol con iconos (`.role-point`).
   - Nota integrada de no diagnóstico (`.rf-note`).
4. **Sección Random Forest** (`.rf-demo`):
   - Columna izquierda con acordeón (`.rf-description.info-card`).
   - Columna derecha con simulación (`.rf-interactive.info-card`).

## Estados y lógica (TypeScript)

- `selectedQuestion: number | null` → pregunta activa.
- `isAnimating: boolean` → bloquea botones durante animación.
- `showResult: boolean` → muestra resultado final al terminar.
- `rolActivo: 'padres' | 'psicologos'` → tab activo del panel.
- `isRoleSwitching: boolean` → activa animación al alternar el rol.

Flujo al hacer clic en una pregunta:
1. Se asigna `selectedQuestion`.
2. Se activa `isAnimating` y se oculta resultado.
3. Después de **2500ms**, se muestra el resultado y se apaga la animación.

## Bloque "¿Para quien va dirigido?"

### Panel único con tabs

- Título centrado y selector alineado al centro, bajo el título.
- Selector tipo tabs: **Padres y docentes** / **Psicólogos**.
- El contenido cambia con `rolActivo`.

**Contenido por rol**

- Línea principal (1 oración).
- 4 rectángulos horizontales con texto e ícono (sin viñetas).
- Iconografía desde `src/assets/iconos/NuestroSistema/`:
  - Padres: `FrasePadre1.png` a `FrasePadre4.png`.
  - Psicólogos: `FrasePsico1.png` a `FrasePsico4.png`.

### Nota integrada

- Texto fijo bajo el panel: "Importante: el sistema no diagnostica; genera una alerta temprana sobre un posible trastorno."

## Sección Random Forest (acordeón)

### Encabezado

- Título: "¿Qué es Random Forest?".
- Línea introductoria: "Usamos Random Forest para combinar múltiples decisiones y obtener una alerta más estable."

### Acordeón (3 ítems)

1. **Un árbol toma decisiones**: reglas + camino por preguntas.
2. **Un bosque combina muchos árboles**: variaciones + reducción de errores.
3. **¿Cómo se obtiene la alerta?**: votación + nivel de alerta.

## Simulación Random Forest

- Botones `.question-btn` se deshabilitan cuando `isAnimating` es `true`.
- Cada árbol se renderiza con clase `.tree` y `animationDelay` escalonado.
- Voto "Sí/No" se marca con `.vote.positive` o `.vote.negative`.
- El arreglo `questions` incluye **3 preguntas demo** y **5 votos** por árbol.
- Se fuerza el reinicio de animación con `animationCycle` al cambiar de pregunta.
- Texto guía: "Simulación simplificada: observa cómo varios 'árboles' pueden votar por un resultado."

## Estilos clave

- Tarjetas con gradiente suave y hover (elevación + cambio de borde).
- Íconos en cajas **80x80** con fondo azul translúcido.
- Flechas entre tarjetas (`.flow-arrow`) con color **#51C2F4**.
- Secciones informativas usan `.info-card` global.
- Panel único con tabs (`.audience-panel`, `.role-tabs`, `.role-tab`).
- Rectángulos con icono y texto (`.role-points`, `.role-point`, `.role-point-icon`).
- Nota integrada con borde izquierdo (`.rf-note`).

## Animaciones

- `treeVote`: entrada de cada árbol (0.5s–0.6s).
- `fadeIn`: aparición del resultado final.
- Cambio de rol: tabs con pulso sutil y cards con transición de aparición.

## Clases CSS clave

- `.card`, `.icon`, `.flow-arrow`, `.question-btn`, `.forest`, `.tree`, `.result`.
- `.audience-section`, `.audience-panel`, `.role-tabs`, `.role-tab`.
- `.role-points`, `.role-point`, `.role-point-icon`, `.rf-note`.
- `.rf-accordion`, `.accordion-item`, `.accordion-trigger`, `.accordion-content`.

## Responsive

- `max-width: 1024px`: flechas se ocultan y cards se distribuyen en 2 columnas.
- `max-width: 768px`: cards en columna, tipografías reducidas.
- `max-width: 480px`: padding y tamaños compactos.
- Tabs y contenido se ajustan a una sola columna en mobile.

## Flujo de usuario

1. Lee las 4 etapas del sistema.
2. Revisa roles, privacidad y el aviso de no diagnóstico.
3. En la sección Random Forest, revisa el acordeón.
4. Selecciona una pregunta en la simulación.
5. Observa la animación de votos y el resultado final.
