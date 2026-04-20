# Tecnologias y herramientas (evidencia frontend)

## Runtime y UI

- React `19.2.0`
- React DOM `19.2.0`
- React Router DOM `7.10.1`
- TypeScript `~5.9.3`

## Build y tooling

- Vite `^7.2.4`
- Plugin React para Vite `@vitejs/plugin-react`
- ESLint `^9.39.1`
- `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

## Dependencias funcionales adicionales

- `qrcode` (render de QR en flujos MFA)
- `axios` (presente en dependencias; uso no central en la arquitectura HTTP actual)

## Scripts disponibles (`package.json`)

- `npm run dev` -> entorno local con Vite
- `npm run build` -> compilacion TypeScript + build Vite
- `npm run lint` -> analisis estatico
- `npm run preview` -> preview de build

## Observaciones

1. No existe script `test` en `package.json`.
2. La capa HTTP principal de la app usa `fetch` encapsulado en `src/services/api/httpClient.ts`.
3. El frontend depende de variables `VITE_*` para configuracion de entorno (por ejemplo `VITE_API_BASE_URL`).
