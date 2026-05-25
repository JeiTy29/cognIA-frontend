import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function resolveManualChunk(id: string) {
    const normalizedId = id.replaceAll('\\', '/');

    if (normalizedId.includes('/node_modules/react/') || normalizedId.includes('/node_modules/react-dom/')) {
        return 'react-vendor';
    }

    if (normalizedId.includes('/node_modules/react-router') || normalizedId.includes('/node_modules/@remix-run/')) {
        return 'router-vendor';
    }

    if (normalizedId.includes('/node_modules/axios/') || normalizedId.includes('/node_modules/qrcode/')) {
        return 'shared-vendor';
    }

    if (normalizedId.includes('/src/pages/Administrador/') || normalizedId.includes('/src/hooks/useAdmin') || normalizedId.includes('/src/hooks/dashboard/')) {
        return 'admin';
    }

    if (normalizedId.includes('/src/pages/Plataforma/Cuestionario') || normalizedId.includes('/src/services/questionnaires/')) {
        return 'questionnaire';
    }

    if (normalizedId.includes('/src/pages/Plataforma/Historial') || normalizedId.includes('/src/pages/Plataforma/CuestionarioCompartido')) {
        return 'history';
    }

    if (normalizedId.includes('/src/pages/Autenticacion/') || normalizedId.includes('/src/components/MFA/')) {
        return 'auth';
    }

    if (normalizedId.includes('/src/pages/Inicio/')) {
        return 'public-pages';
    }

    return undefined;
}

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    return resolveManualChunk(id);
                }
            }
        }
    }
});
