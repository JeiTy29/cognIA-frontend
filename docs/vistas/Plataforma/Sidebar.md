# Sidebar (global)

## Propósito

Proveer navegación principal compacta con solo iconos y etiqueta flotante (flyout) al hover/focus.

## Comportamiento

- Estado base: barra angosta con iconos centrados.
- Hover/focus: aparece etiqueta a la derecha con transición sutil (fade + desplazamiento leve).
- Estado activo: fondo suave + indicador lateral con animación rápida de desplazamiento vertical.

## Estilo actual

- Fondo de Sidebar: azul claro **#51C2F4**.
- Iconos en blanco y hover con fondo claro.
- Label flotante con fondo blanco, texto azul y tamaño de texto ligeramente mayor (16px).

## Ítems, íconos y rutas

Los ítems se configuran en `SidebarConfig.tsx` con `label`, `icon` y `paths`.

**Padre/Tutor**
- Cuestionario → `IconClipboard` → `/padre/cuestionario`
- Historial → `IconHistory` → `/padre/historial`
- Ayuda → `IconSupport` → `/padre/ayuda`
- Cuenta → `IconUser` → `/padre/cuenta`

**Psicólogo**
- Cuestionario → `IconClipboard` → `/psicologo/cuestionario`
- Historial → `IconHistory` → `/psicologo/historial`
- Sugerencias → `IconLightbulb` → `/psicologo/sugerencias`
- Ayuda → `IconSupport` → `/psicologo/ayuda`
- Cuenta → `IconUser` → `/psicologo/cuenta`

Notas:
- `Sugerencias` solo aparece para rol psicólogo.
- El indicador activo usa `.sidebar-active-indicator` y `.sidebar-active-bg`, posicionados con `transform` para el deslizamiento.
- El ítem **Cuenta** se ubica al final de la lista en ambos roles.

## Accesibilidad

- Hover y focus muestran el label.
- Focus visible con contorno.
- Activo no depende solo del color.

## Archivos

- Componente: `src/components/Sidebar/Sidebar.tsx`
- Estilos: `src/components/Sidebar/Sidebar.css`
- Configuración: `src/components/Sidebar/SidebarConfig.tsx`
- Layout: `src/components/SidebarLayout/SidebarLayout.tsx`
