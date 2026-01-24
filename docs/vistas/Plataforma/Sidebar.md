# Sidebar (global)

## Propósito

Proveer navegación principal compacta con solo iconos y etiqueta flotante (flyout) al hover/focus.

## Comportamiento

- Estado base: barra angosta con iconos centrados.
- Hover/focus: aparece etiqueta a la derecha con transición sutil (fade + desplazamiento leve).
- Estado activo: fondo suave + indicador lateral.

## Ítems, íconos y rutas

Los ítems se configuran en `SidebarConfig.tsx` con `label`, `icon` y `paths`.

**Padre/Tutor**
- Cuestionario → `IconClipboard` → `/padre/cuestionario`
- Historial → `IconHistory` → `/padre/historial`
- Cuenta → `IconUser` → `/padre/cuenta`
- Soporte → `IconSupport` → `/padre/soporte`

**Psicólogo**
- Cuestionario → `IconClipboard` → `/psicologo/cuestionario`
- Historial → `IconHistory` → `/psicologo/historial`
- Sugerencias → `IconLightbulb` → `/psicologo/sugerencias`
- Cuenta → `IconUser` → `/psicologo/cuenta`
- Soporte → `IconSupport` → `/psicologo/soporte`

## Accesibilidad

- Hover y focus muestran el label.
- Focus visible con contorno.
- Activo no depende solo del color.

## Archivos

- Componente: `src/components/Sidebar/Sidebar.tsx`
- Estilos: `src/components/Sidebar/Sidebar.css`
- Configuración: `src/components/Sidebar/SidebarConfig.tsx`
- Layout: `src/components/SidebarLayout/SidebarLayout.tsx`
