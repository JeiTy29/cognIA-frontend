import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../Modal/Modal';
import { getNotifications, markNotificationAsRead } from '../../services/notifications/notifications.api';
import type { NotificationDTO } from '../../services/notifications/notifications.types';
import { useAuth } from '../../hooks/auth/useAuth';
import {
    formatDateTime,
    normalizeBackendText,
    normalizeNotificationType,
    safeDisplayText
} from '../../utils/questionnaires/presentation';
import { emitNotificationsRefresh, onNotificationsRefresh } from '../../utils/notifications/events';
import './NotificationsBell.css';

function getNotificationReviewId(notification: NotificationDTO): string | null {
    const maybeReviewId = (notification as { reviewId?: unknown }).reviewId ?? (notification as { review_id?: unknown }).review_id;
    if (typeof maybeReviewId === 'string' && maybeReviewId.trim().length > 0) {
        return maybeReviewId.trim();
    }

    const payload = (notification as { payload?: unknown }).payload;
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const reviewId = (payload as Record<string, unknown>).reviewId ?? (payload as Record<string, unknown>).review_id;
        if (typeof reviewId === 'string' && reviewId.trim().length > 0) {
            return reviewId.trim();
        }
    }

    return null;
}

function getNotificationSessionId(notification: NotificationDTO): string | null {
    const maybeSessionId = (notification as { sessionId?: unknown }).sessionId ?? (notification as { session_id?: unknown }).session_id;
    if (typeof maybeSessionId === 'string' && maybeSessionId.trim().length > 0) {
        return maybeSessionId.trim();
    }
    return null;
}

function getNotificationTarget(notification: NotificationDTO, primaryRole: string | null) {
    if (notification.type === 'questionnaire_share_requested' && primaryRole === 'psicologo') {
        return '/psicologo/solicitudes';
    }
    if (notification.type === 'professional_review_created' && primaryRole === 'padre') {
        return '/padre/orientacion-profesional';
    }
    if (notification.type === 'professional_review_updated' && primaryRole === 'padre') {
        return '/padre/orientacion-profesional';
    }
    const sessionId = getNotificationSessionId(notification);
    if (sessionId && primaryRole === 'padre') {
        return '/padre/historial';
    }
    if (sessionId && primaryRole === 'psicologo') {
        return '/psicologo/evaluaciones';
    }
    if (notification.case_public_id && primaryRole === 'padre') {
        return '/padre/casos';
    }
    return null;
}

function buildNotificationTitle(notification: NotificationDTO) {
    const normalizedType = normalizeNotificationType(notification.type);
    const title = safeDisplayText(notification.title, '');
    if (!title) return normalizedType;

    const normalizedTitle = title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (/questionnaire_|professional_review_/.test(normalizedTitle)) {
        return normalizedType;
    }

    return title;
}

function buildNotificationMessage(notification: NotificationDTO) {
    const message = safeDisplayText(notification.message, '');
    if (message) return message;
    if (notification.case_public_id) {
        return `Caso ${normalizeBackendText(notification.case_public_id)}.`;
    }
    return 'Información protegida no disponible para visualización.';
}

type NotificationModalContent = {
    title: string;
    message: string;
    createdAt: string | null;
};

export function NotificationsBell() {
    const navigate = useNavigate();
    const { isAuthenticated, primaryRole } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<NotificationDTO[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [workingId, setWorkingId] = useState<string | null>(null);
    const [modalContent, setModalContent] = useState<NotificationModalContent | null>(null);
    const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, pages: 1 });
    const pageSize = 20;

    const loadNotifications = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        setError(null);
        try {
            const response = await getNotifications({ unread_only: false, page: currentPage, page_size: pageSize });
            setItems(response.items);
            setUnreadCount(Number(response.summary?.unread_count ?? 0));
            setPagination(response.pagination);
        } catch {
            setError('No fue posible cargar las notificaciones.');
        } finally {
            setLoading(false);
        }
    }, [currentPage, isAuthenticated]);

    useEffect(() => {
        loadNotifications().catch(() => undefined);
    }, [loadNotifications]);

    useEffect(
        () =>
            onNotificationsRefresh((detail) => {
                if (detail?.removeGrantIds?.length) {
                    setItems((prev) =>
                        prev.filter((item) => !detail.removeGrantIds?.includes(item.grant_id ?? ''))
                    );
                    setUnreadCount((prev) => Math.max(0, prev - detail.removeGrantIds!.length));
                }
                loadNotifications().catch(() => undefined);
            }),
        [loadNotifications]
    );

    const unreadItems = useMemo(
        () => items.filter((item) => !item.read_at),
        [items]
    );
    const readItems = useMemo(
        () => items.filter((item) => Boolean(item.read_at)),
        [items]
    );
    const activeItems = activeTab === 'unread' ? unreadItems : readItems;
    const sortedItems = useMemo(
        () => [...activeItems].sort((left, right) => Date.parse(right.created_at ?? '') - Date.parse(left.created_at ?? '')),
        [activeItems]
    );

    const handleMarkAsRead = async (notification: NotificationDTO, navigateAfter = false, targetOverride?: string) => {
        const target = targetOverride ?? getNotificationTarget(notification, primaryRole);
        const notificationId = notification.notification_id;
        setWorkingId(notificationId);
        try {
            const updatedNotification = await markNotificationAsRead(notificationId);
            setItems((prev) =>
                prev.map((item) =>
                    item.notification_id === notificationId
                        ? { ...item, read_at: updatedNotification?.read_at ?? new Date().toISOString() }
                        : item
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
            emitNotificationsRefresh();
            if (navigateAfter && target) {
                setIsOpen(false);
                navigate(target);
            }
        } catch (requestError) {
            const payload =
                typeof requestError === 'object' && requestError && 'payload' in requestError
                    ? (requestError as { payload?: { error?: string } }).payload
                    : null;
            const code = payload?.error ?? '';
            if (code === 'notification_not_found') {
                setError('Esta notificación ya no está disponible.');
            } else if (code === 'notification_forbidden') {
                setError('No tienes permiso para modificar esta notificación.');
            } else {
                setError('No fue posible actualizar la notificación.');
            }
        } finally {
            setWorkingId(null);
        }
    };

    const handleNotificationView = async (notification: NotificationDTO) => {
        const target = getNotificationTarget(notification, primaryRole);
        const title = buildNotificationTitle(notification);
        const message = buildNotificationMessage(notification);

        if (notification.type === 'questionnaire_share_requested' && primaryRole === 'psicologo') {
            await handleMarkAsRead(notification);
            navigate('/psicologo/solicitudes', {
                state: {
                    notificationGrantId: notification.grant_id,
                    status: 'pending'
                }
            });
            setIsOpen(false);
            return;
        }

        const reviewId = getNotificationReviewId(notification);

        const notificationSessionId = getNotificationSessionId(notification);
        if (
            (
                notification.type === 'questionnaire_share_accepted' ||
                notification.type === 'professional_review_created' ||
                notification.type === 'professional_review_updated'
            ) &&
            primaryRole === 'padre' &&
            notificationSessionId
        ) {
            if (notification.type === 'professional_review_created' || notification.type === 'professional_review_updated') {
                const target = `/padre/orientacion-profesional?sessionId=${encodeURIComponent(notificationSessionId)}${
                    reviewId ? `&reviewId=${encodeURIComponent(reviewId)}` : ''
                }`;
                if (notification.read_at) {
                    setIsOpen(false);
                    navigate(target);
                    return;
                }
                await handleMarkAsRead(notification, false);
                setIsOpen(false);
                navigate(target);
                return;
            }

            await handleMarkAsRead(notification);
            navigate('/padre/historial', {
                state: { openHistorySessionId: notificationSessionId }
            });
            setIsOpen(false);
            return;
        }

        if (notification.type === 'questionnaire_share_rejected' && primaryRole === 'padre') {
            await handleMarkAsRead(notification);
            setIsOpen(false);
            setModalContent({
                title,
                message,
                createdAt: notification.created_at ?? null
            });
            return;
        }

        if (target) {
            if (notification.read_at) {
                setIsOpen(false);
                navigate(target);
                return;
            }
            await handleMarkAsRead(notification, true, target);
            return;
        }

        await handleMarkAsRead(notification);
        setIsOpen(false);
        setModalContent({
            title,
            message,
            createdAt: notification.created_at ?? null
        });
    };

    if (!isAuthenticated) return null;

    return (
        <>
            <button
                type="button"
                className="notifications-bell"
                aria-label="Abrir notificaciones"
                onClick={() => setIsOpen(true)}
            >
                <span className="notifications-bell__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 3a5 5 0 0 0-5 5v2.4c0 .8-.24 1.57-.69 2.22L4.6 15.1A1 1 0 0 0 5.4 16.7h13.2a1 1 0 0 0 .8-1.6l-1.71-2.48a3.9 3.9 0 0 1-.69-2.22V8a5 5 0 0 0-5-5Z" />
                        <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
                    </svg>
                </span>
                {unreadCount > 0 ? <span className="notifications-bell__badge">{unreadCount}</span> : null}
            </button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <div className="notifications-modal">
                    <div className="notifications-modal__header">
                        <div>
                            <h2>Notificaciones</h2>
                            <p>Revisa solicitudes, revisiones y novedades recientes.</p>
                        </div>
                        <div className="notifications-modal__header-actions">
                            <button type="button" onClick={() => loadNotifications().catch(() => undefined)}>
                                Actualizar
                            </button>
                        </div>
                    </div>
                    <div className="notifications-modal__tabs">
                        <button
                            type="button"
                            className={`notifications-modal__tab ${activeTab === 'unread' ? 'is-active' : ''}`}
                            onClick={() => setActiveTab('unread')}
                        >
                            No leídas ({unreadCount})
                        </button>
                        <button
                            type="button"
                            className={`notifications-modal__tab ${activeTab === 'read' ? 'is-active' : ''}`}
                            onClick={() => setActiveTab('read')}
                        >
                            Leídas ({readItems.length})
                        </button>
                    </div>
                    {error ? <div className="notifications-modal__error">{error}</div> : null}
                    {loading ? <div className="notifications-modal__empty">Cargando notificaciones...</div> : null}
                    {!loading && sortedItems.length === 0 ? (
                        <div className="notifications-modal__empty">
                            {activeTab === 'unread'
                                ? 'No tienes notificaciones pendientes por ahora.'
                                : 'Aún no hay notificaciones leídas.'}
                        </div>
                    ) : null}
                    {!loading && sortedItems.length > 0 ? (
                        <div className="notifications-modal__list">
                            {sortedItems.map((notification) => (
                                <article
                                    key={notification.notification_id}
                                    className={`notifications-modal__item ${notification.read_at ? '' : 'is-unread'}`}
                                >
                                    <strong>{buildNotificationTitle(notification)}</strong>
                                    <p>{buildNotificationMessage(notification)}</p>
                                    {notification.case_public_id ? (
                                        <small>Caso {normalizeBackendText(notification.case_public_id)}</small>
                                    ) : null}
                                    <small>{formatDateTime(notification.created_at)}</small>
                                    <div className="notifications-modal__actions">
                                        {!notification.read_at ? (
                                            <button
                                                type="button"
                                                disabled={workingId === notification.notification_id}
                                                onClick={() => {
                                                    handleMarkAsRead(notification).catch(() => undefined);
                                                }}
                                            >
                                                {workingId === notification.notification_id ? 'Guardando...' : 'Marcar como leída'}
                                            </button>
                                        ) : null}
                                        <button
                                            type="button"
                                            disabled={workingId === notification.notification_id}
                                            onClick={() => {
                                                handleNotificationView(notification).catch(() => undefined);
                                            }}
                                        >
                                            Ver
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : null}
                    {pagination.pages > 1 && !loading ? (
                        <div className="notifications-modal__pagination">
                            <span>
                                Página {pagination.page} de {pagination.pages}
                            </span>
                            <button
                                type="button"
                                disabled={loading || pagination.page <= 1}
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            >
                                Anterior
                            </button>
                            <button
                                type="button"
                                disabled={loading || pagination.page >= pagination.pages}
                                onClick={() => setCurrentPage((prev) => Math.min(pagination.pages, prev + 1))}
                            >
                                Siguiente
                            </button>
                        </div>
                    ) : null}
                </div>
            </Modal>

            <Modal isOpen={modalContent !== null} onClose={() => setModalContent(null)}>
                <div className="notifications-modal">
                    <div className="notifications-modal__header">
                        <h2>{modalContent?.title ?? 'Notificación'}</h2>
                    </div>
                    <div className="notifications-modal__item is-unread">
                        <p>{modalContent?.message}</p>
                        <small>{formatDateTime(modalContent?.createdAt)}</small>
                    </div>
                    <div className="notifications-modal__actions">
                        <button type="button" onClick={() => setModalContent(null)}>
                            Cerrar
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
