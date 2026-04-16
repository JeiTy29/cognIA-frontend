import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuditLogs, normalizeAuditLogs, type AuditLogItem } from '../services/admin/audit';
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
    if (status === 403) return 'No tienes permisos para consultar auditoría.';
    if (status === 404) return 'El backend no expone auditoría en este entorno.';
    if (status >= 500) return 'Error del servidor. Intenta más tarde.';
    return 'No fue posible cargar los registros de auditoría.';
}

export function useAuditLogs() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [items, setItems] = useState<AuditLogItem[]>([]);
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

    const loadAuditLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getAuditLogs();
            setItems(normalizeAuditLogs(response));
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
            void loadAuditLogs();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadAuditLogs]);

    return {
        items,
        loading,
        error,
        lastUpdated,
        reload: loadAuditLogs
    };
}
