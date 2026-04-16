# Psicologos

## Ruta y acceso
- Ruta: `/admin/psicologos`
- Rol requerido: `ADMIN`

## Archivos involucrados
- `src/pages/Administrador/Psicologos/Psicologos.tsx`
- `src/pages/Administrador/Psicologos/Psicologos.css`
- `src/pages/Administrador/AdminShared.css`
- `src/hooks/usePsychologists.ts`
- `src/services/admin/psychologists.ts`
- `src/services/admin/users.ts`

## Endpoints usados
- `GET /api/v1/users?page=<int>&page_size=<int>`
- `POST /api/admin/psychologists/{user_id}/approve`
- `POST /api/admin/psychologists/{user_id}/reject`

## Objetivo funcional
- Mostrar solo psicologos pendientes de revision o rechazados.
- Evitar duplicar psicologos aprobados en este modulo.
- Mantener aprobados visibles unicamente en la tabla general de usuarios.

## Flujo UI
1. La vista carga todos los usuarios paginados desde `/api/v1/users`.
2. Se filtran localmente los usuarios psicologos con estado de revision identificable como `pending` o `rejected`.
3. La tabla permite aprobar o rechazar por fila.
4. El rechazo abre modal y exige una razon.
5. Tras aprobar o rechazar, se recarga el listado.

## Decisiones visuales
- Se reutilizo el patron admin actual: header, divisor, filtros superiores, tabla, paginacion y modal.
- No se agregaron cards.
- No se creo un layout nuevo para esta vista.

## Limitaciones y riesgos
- No existe en este workspace una especificacion local del payload/respuesta para estados de revision.
- La vista identifica estados usando campos opcionales ya presentes en la respuesta de usuarios, como `review_status`, `approval_status`, `psychologist_status`, `rejection_reason` o `review_reason`.
- Si el backend no expone esos campos, la vista muestra aviso y no inventa estados.
- El payload de rechazo se envia como `{ "reason": "<texto>" }` por no existir contrato local mas detallado en este repo.

## Pruebas manuales
- Entrar a `/admin/psicologos`.
- Confirmar que no aparezcan usuarios aprobados.
- Filtrar por `Pendientes` y `Rechazados`.
- Aprobar un psicologo y verificar que desaparezca de esta vista.
- Rechazar un psicologo con razon y verificar recarga del listado.
