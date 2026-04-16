import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getEmailHealth,
    normalizeEmailHealth,
    resolveEmailHealthStatus,
    type EmailHealthRow
} from '../services/admin/emailHealth';
import { ApiError } from '../services/api/httpClient';
import { useAuth } from './auth/useAuth';

function extractStatus(error: unknown) {
    if (error instanceof ApiError) {
        return error.status;
    }
    return 0;
}

function mapErrorMessage(status: number) {
    if (status === 401) return 'Sesión expirada o no autenticado. Inicia sesión nuevamente.';
    if (status === 403) return 'No tienes permisos para consultar la salud de correo.';
    if (status === 404) return 'El backend no expone salud de correo en este entorno.';
    if (status >= 500) return 'Error del servidor. Intenta más tarde.';
    return 'No fue posible cargar la salud de correo.';
}

export function useEmailHealth() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [items, setItems] = useState<EmailHealthRow[]>([]);
    const [statusLabel, setStatusLabel] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const handleUnauthorized = useCallback(() => {
        logout('expired');
        navigate('/inicio-sesion', {
            replace: true,
            state: { message: 'Sesión expirada o no autenticado. Inicia sesión nuevamente.' }
        });
    }, [logout, navigate]);

    const loadEmailHealth = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getEmailHealth();
            setItems(normalizeEmailHealth(response));
            setStatusLabel(resolveEmailHealthStatus(response));
            setLastUpdated(new Date());
        } catch (loadError) {
            const status = extractStatus(loadError);
            setError(mapErrorMessage(status));
            if (status === 401) {
                handleUnauthorized();
            }
        } finally {
            setLoading(false);
        }
    }, [handleUnauthorized]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadEmailHealth();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadEmailHealth]);

    return {
        items,
        statusLabel,
        loading,
        error,
        lastUpdated,
        reload: loadEmailHealth
    };
}
