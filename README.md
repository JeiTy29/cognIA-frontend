# cognIA-frontend

Frontend en React + TypeScript + Vite para CognIA.

## Setup

1. `npm install`
2. Copia `.env.example` a `.env.local` si necesitas cambiar la URL del backend
3. Verifica que `VITE_API_BASE_URL` apunte al backend correcto
4. Si quieres entrar a rutas protegidas en local sin login real, habilita:
   `VITE_DEV_AUTH_BYPASS=true`
   `VITE_DEV_ROLE=guardian`
5. `npm run dev`
