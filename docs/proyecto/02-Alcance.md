# Alcance de la documentacion frontend

## Que cubre esta documentacion

Esta documentacion cubre el estado **vigente** del frontend:

1. Arquitectura de cliente y capas tecnicas.
2. Navegacion real, guardas y rutas por rol.
3. Flujos implementados de autenticacion, cuestionario, historial, share y PDF.
4. Modulos funcionales de plataforma y administracion.
5. Consumo real de API desde `src/services/*`.
6. Mecanismos de desarrollo (bypass auth) y sus limites.
7. Vacios de calidad observables desde repositorio frontend.

## Que no cubre

1. Contrato backend definitivo no visible en este repositorio.
2. Validacion de comportamiento de endpoints en entorno real.
3. Garantias de despliegue por ambiente (dev/stage/prod).

## Regla de verificacion

Toda afirmacion debe ser:

- comprobable desde codigo frontend, o
- marcada como inferida desde el consumo del frontend, o
- marcada como no verificable solo con evidencia frontend.
