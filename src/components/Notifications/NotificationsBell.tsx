import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../Modal/Modal';
import { getNotifications, markNotificationAsRead } from '../../services/notifications/notifications.api';
import type { NotificationDTO } from '../../services/notifications/notifications.types';
import { useAuth } from '../../hooks/auth/useAuth';
import {
    formatDateTime,
    normalizeBackendText,
    normalizeNotificationType
} from '../../utils/questionnaires/presentation';
import { emitNotificationsRefresh, onNotificationsRefresh } from '../../utils/notifications/events';
import './NotificationsBell.css';

function getNotificationTarget(notification: NotificationDTO, primaryRole: string | null) {
    if (notification.type === 'questionnaire_share_requested' && primaryRole === 'psicologo') {
        return '/psicologo/solicitudes';
    }
    if (notification.session_id && primaryRole === 'padre') {
        return '/padre/historial';
    }
    if (notification.session_id && primaryRole === 'psicologo') {
        return '/psicologo/evaluaciones';
    }
    return null;
}

function buildNotificationTitle(notification: NotificationDTO) {
    const normalizedType = normalizeNotificationType(notification.type);
    const title = normalizeBackendText(notification.title, '');
    if (!title) return normalizedType;

    const normalizedTitle = title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (/questionnaire_|professional_review_/.test(normalizedTitle)) {
        return normalizedType;
    }

    return title;
}

function buildNotificationMessage(notification: NotificationDTO) {
    const message = normalizeBackendText(notification.message, '');
    if (message) return message;
    if (notification.case_public_id) {
        return `Caso ${normalizeBackendText(notification.case_public_id)}.`;
    }
    return 'Sin detalle disponible.';
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

    const loadNotifications = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        setError(null);
        try {
            const response = await getNotifications({ unread_only: true, page: 1, page_size: 20 });
            setItems(response.items.filter((item) => !item.read_at));
            setUnreadCount(Number(response.summary?.unread_count ?? 0));
        } catch {
            setError('No fue posible cargar las notificaciones.');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

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

    const sortedItems = useMemo(
        () => [...items].sort((left, right) => Date.parse(right.created_at ?? '') - Date.parse(left.created_at ?? '')),
        [items]
    );

    const handleMarkAsRead = async (notification: NotificationDTO, navigateAfter = false) => {
        const target = getNotificationTarget(notification, primaryRole);
        const notificationId = notification.notification_id;
        setWorkingId(notificationId);
        try {
            await markNotificationAsRead(notificationId);
            setItems((prev) => prev.filter((item) => item.notification_id !== notificationId));
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

        if (
            (
                notification.type === 'questionnaire_share_accepted' ||
                notification.type === 'professional_review_created' ||
                notification.type === 'professional_review_updated'
            ) &&
            primaryRole === 'padre' &&
            notification.session_id
        ) {
            await handleMarkAsRead(notification);
            navigate('/padre/historial', {
                state: { openHistorySessionId: notification.session_id }
            });
            setIsOpen(false);
            return;
        }

        if (notification.type === 'questionnaire_share_rejected' && primaryRole === 'padre') {
            await handleMarkAsRead(notification);
            setModalContent({
                title,
                message,
                createdAt: notification.created_at ?? null
            });
            return;
        }

        if (target) {
            await handleMarkAsRead(notification, true);
            return;
        }

        await handleMarkAsRead(notification);
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
                        <h2>Notificaciones</h2>
                        <button type="button" onClick={() => loadNotifications().catch(() => undefined)}>
                            Actualizar
                        </button>
                    </div>
                    {error ? <div className="notifications-modal__error">{error}</div> : null}
                    {loading ? <div className="notifications-modal__empty">Cargando notificaciones...</div> : null}
                    {!loading && sortedItems.length === 0 ? (
                        <div className="notifications-modal__empty">No tienes notificaciones pendientes por ahora.</div>
                    ) : null}
                    {!loading && sortedItems.length > 0 ? (
                        <div className="notifications-modal__list">
                            {sortedItems.map((notification) => (
                                <article key={notification.notification_id} className="notifications-modal__item is-unread">
                                    <strong>{buildNotificationTitle(notification)}</strong>
                                    <p>{buildNotificationMessage(notification)}</p>
                                    {notification.case_public_id ? (
                                        <small>Caso {normalizeBackendText(notification.case_public_id)}</small>
                                    ) : null}
                                    <small>{formatDateTime(notification.created_at)}</small>
                                    <div className="notifications-modal__actions">
                                        <button
                                            type="button"
                                            disabled={workingId === notification.notification_id}
                                            onClick={() => {
                                                handleMarkAsRead(notification).catch(() => undefined);
                                            }}
                                        >
                                            {workingId === notification.notification_id ? 'Guardando...' : 'Marcar como leída'}
                                        </button>
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
