# Estilos globales

## Descripción general

Guía de estilos compartidos para todas las vistas. Aquí se define el tema, el fondo animado y las clases reutilizables que usan múltiples páginas.

## Archivos base

- Tema y variables: `src/styles/theme.css`
- Estilos globales: `src/styles/globals.css`

## Variables de color (theme.css)

- `--primary`: **#51C2F4** (azul principal)
- `--login-btn`: **#1790E9** (botón primario)
- `--register-btn`: **#215F8F** (botón oscuro)
- `--text-main`: **#2A2D34**
- `--text-secondary`: **#555**
- `--bg-header`: **#ffffff**
- `--card-bg`: **#ffffff**

## Fondo animado (globals.css)

El fondo combina un degradado base con “manchas” animadas usando pseudo-elementos:

- Base del `body`: gradiente lineal **#FFFFFF → #E2F0FF**.
- `body::before`: 3 manchas radiales (azules) con **blur 26px**.
- `body::after`: 2 manchas radiales (blanco/azul) con **blur 34px**.
- Animaciones: `blobShift` (18s), `blobDrift` (16s), `blobShiftAlt` (24s), `blobDriftAlt` (20s).
- Movimiento suave continuo, pensado para no distraer.
- `prefers-reduced-motion`: desactiva animaciones.

## Tipografía base

- Fuente global: **'Segoe UI', sans-serif**.
- Color base del texto: `var(--text-main)` (**#2A2D34**).

## Clases reutilizables

### `.section-title`

- Títulos estandarizados en vistas de inicio.
- Tamaño: **2.2rem**, color **#215F8F**, weight **700**.
- Subrayado con `::after` (3px alto), ligeramente más ancho que el texto.

### `.info-card`

- Contenedor informativo reusable.
- Fondo **#F9FCFF**, radio **20px**, borde **rgba(81,194,244,0.15)**.
- Sombra suave con hover.

### `.card-title` / `.description-text`

- Títulos y párrafos homogéneos.
- `card-title`: **24px**, color **#51C2F4**.
- `description-text`: **#555**, line-height **1.8**.

## Notas de mantenimiento

- `body` usa `overflow-x: hidden` para evitar scroll horizontal.
- Los enlaces heredan color por defecto (`a { color: inherit; }`).
- Al crear nuevas vistas, usa `.section-title` y `.info-card` para consistencia.
