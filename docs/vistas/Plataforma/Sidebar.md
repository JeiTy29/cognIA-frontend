# Sidebar (global)

## Propósito

Proveer navegación principal compacta con solo iconos y etiqueta flotante (flyout) al hover/focus.

## Comportamiento

- Estado base: barra angosta con iconos centrados.
- Hover/focus: aparece etiqueta a la derecha con transición sutil (fade + desplazamiento leve).
- Estado activo: fondo suave + indicador lateral.

## Roles y rutas

**Padre/Tutor**
- /padre/cuestionario
- /padre/historial
- /padre/cuenta
- /padre/soporte

**Psicólogo**
- /psicologo/cuestionario
- /psicologo/historial
- /psicologo/sugerencias
- /psicologo/cuenta
- /psicologo/soporte

## Accesibilidad

- Hover y focus muestran el label.
- Focus visible con contorno.
- Activo no depende solo del color.

## Archivos

- Componente: `src/components/Sidebar/Sidebar.tsx`
- Estilos: `src/components/Sidebar/Sidebar.css`
- Configuración: `src/components/Sidebar/SidebarConfig.tsx`
- Layout: `src/components/SidebarLayout/SidebarLayout.tsx`
