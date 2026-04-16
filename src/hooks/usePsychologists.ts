import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    approvePsychologist,
    getPsychologistRejectionReason,
    isPsychologistUser,
    rejectPsychologist,
    resolvePsychologistReviewState
} from '../services/admin/psychologists';
import { getAllUsers } from '../services/admin/users';
import type { User } from '../services/admin/users';
import { ApiError } from '../services/api/httpClient';
import { useAuth } from './auth/useAuth';

export interface PsychologistAdminItem extends User {
    reviewState: 'pending' | 'rejected';
    reviewReason: string | null;
}

function extractStatus(error: unknown) {
    if (error instanceof ApiError) {
        return error.status;
    }
    return 0;
}

function mapErrorMessage(status: number, action: 'list' | 'approve' | 'reject') {
    if (status === 400 && action === 'reject') {
        return 'Debes ingresar una razón válida para rechazar al psicólogo.';
    }
    if (status === 400) return 'Solicitud inválida. Revisa los datos e intenta de nuevo.';
    if (status === 401) return 'Sesión expirada o no autenticado. Inicia sesión nuevamente.';
    if (status === 403) return 'No tienes permisos para realizar esta acción.';
    if (status === 404) return action === 'list'
        ? 'No se encontraron psicólogos para revisión.'
        : 'No se encontró el psicólogo seleccionado.';
    if (status === 409) return 'No fue posible completar la acción por conflicto de estado.';
    if (status >= 500) return 'Error del servidor. Intenta más tarde.';
    return 'Ocurrió un error inesperado.';
}

export function usePsychologists() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [items, setItems] = useState<PsychologistAdminItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [statusUnavailable, setStatusUnavailable] = useState(false);
    const [submittingApprove, setSubmittingApprove] = useState(false);
    const [submittingReject, setSubmittingReject] = useState(false);

    const handleUnauthorized = useCallback(() => {
        logout('expired');
        navigate('/inicio-sesion', {
            replace: true,
            state: { message: 'Sesión expirada o no autenticado. Inicia sesión nuevamente.' }
        });
    }, [logout, navigate]);

    const loadPsychologists = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const users = await getAllUsers();
            const psychologists = users.filter(isPsychologistUser);
            const normalized = psychologists
                .map((user) => {
                    const reviewState = resolvePsychologistReviewState(user);
                    if (reviewState !== 'pending' && reviewState !== 'rejected') {
                        return null;
                    }

                    return {
                        ...user,
                        reviewState,
                        reviewReason: getPsychologistRejectionReason(user)
                    } satisfies PsychologistAdminItem;
                })
                .filter((item): item is PsychologistAdminItem => item !== null);

            setItems(normalized);
            setStatusUnavailable(psychologists.length > 0 && normalized.length === 0);
        } catch (loadError) {
            const status = extractStatus(loadError);
            setError(mapErrorMessage(status, 'list'));
            if (status === 401) {
                handleUnauthorized();
            }
        } finally {
            setLoading(false);
        }
    }, [handleUnauthorized]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadPsychologists();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadPsychologists]);

    const approveAction = useCallback(async (userId: string) => {
        setSubmittingApprove(true);
        setError(null);
        setNotice(null);
        try {
            await approvePsychologist(userId);
            setNotice('Psicólogo aprobado correctamente.');
            await loadPsychologists();
            return true;
        } catch (actionError) {
            const status = extractStatus(actionError);
            setError(mapErrorMessage(status, 'approve'));
            if (status === 401) {
                handleUnauthorized();
            }
            return false;
        } finally {
            setSubmittingApprove(false);
        }
    }, [handleUnauthorized, loadPsychologists]);

    const rejectAction = useCallback(async (userId: string, reason: string) => {
        setSubmittingReject(true);
        setError(null);
        setNotice(null);
        try {
            await rejectPsychologist(userId, reason);
            setNotice('Psicólogo rechazado correctamente.');
            await loadPsychologists();
            return true;
        } catch (actionError) {
            const status = extractStatus(actionError);
            setError(mapErrorMessage(status, 'reject'));
            if (status === 401) {
                handleUnauthorized();
            }
            return false;
        } finally {
            setSubmittingReject(false);
        }
    }, [handleUnauthorized, loadPsychologists]);

    const clearMessages = useCallback(() => {
        setError(null);
        setNotice(null);
    }, []);

    return {
        items,
        loading,
        error,
        notice,
        statusUnavailable,
        submittingApprove,
        submittingReject,
        loadPsychologists,
        approvePsychologist: approveAction,
        rejectPsychologist: rejectAction,
        clearMessages
    };
}
