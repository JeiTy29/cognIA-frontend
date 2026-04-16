# Salud de Correo

## Ruta y acceso
- Ruta: `/admin/correo`
- Rol requerido: `ADMIN`

## Archivos involucrados
- `src/pages/Administrador/SaludCorreo/SaludCorreo.tsx`
- `src/pages/Administrador/SaludCorreo/SaludCorreo.css`
- `src/pages/Administrador/AdminShared.css`
- `src/hooks/useEmailHealth.ts`
- `src/services/admin/emailHealth.ts`

## Endpoint usado
- `GET /api/admin/email/health`

## Objetivo funcional
- Mostrar el estado del servicio de correo en una vista simple.
- Evitar crear un dashboard nuevo o mezclar esta informacion con metricas.

## Flujo UI
1. La vista consulta el endpoint de salud de correo.
2. El payload se aplana en filas `Indicador / Valor / Comentario`.
3. La busqueda filtra por indicador, clave interna o valor.
4. El boton `Actualizar` repite la consulta.

## Decisiones visuales
- Se reutilizo el patron admin existente.
- Se uso tabla simple y banner de estado.
- No se agregaron cards ni visualizaciones nuevas.

## Limitaciones y riesgos
- No hay especificacion local del payload de `email/health`.
- La vista aplana objetos hasta un nivel de profundidad para no inventar una UI mas compleja.
- Los comentarios de cada fila son heuristicas de frontend; el valor real siempre proviene del backend.

## Pruebas manuales
- Entrar a `/admin/correo`.
- Verificar banner de estado si el endpoint expone `status`, `health` o `state`.
- Buscar un indicador especifico.
- Recargar manualmente la vista desde el boton `Actualizar`.
