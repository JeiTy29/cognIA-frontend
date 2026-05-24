import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../Modal/Modal';
import { getNotifications, markNotificationAsRead } from '../../services/notifications/notifications.api';
import type { NotificationDTO } from '../../services/notifications/notifications.types';
import { useAuth } from '../../hooks/auth/useAuth';
import { formatDateTime, normalizeBackendText } from '../../utils/questionnaires/presentation';
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

export function NotificationsBell() {
    const navigate = useNavigate();
    const { isAuthenticated, primaryRole } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<NotificationDTO[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [workingId, setWorkingId] = useState<string | null>(null);

    const loadNotifications = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        setError(null);
        try {
            const response = await getNotifications({ unread_only: false, page: 1, page_size: 20 });
            setItems(response.items);
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

    useEffect(() => onNotificationsRefresh(() => {
        loadNotifications().catch(() => undefined);
    }), [loadNotifications]);

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
            setItems((prev) => prev.map((item) => item.notification_id === notificationId ? { ...item, read_at: new Date().toISOString() } : item));
            setUnreadCount((prev) => Math.max(0, prev - (notification.read_at ? 0 : 1)));
            emitNotificationsRefresh();
            if (navigateAfter && target) {
                setIsOpen(false);
                navigate(target);
            }
        } catch (requestError) {
            const payload = typeof requestError === 'object' && requestError && 'payload' in requestError
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

    if (!isAuthenticated) return null;

    return (
        <>
            <button
                type="button"
                className="notifications-bell"
                aria-label="Abrir notificaciones"
                onClick={() => setIsOpen(true)}
            >
                <span className="notifications-bell__icon" aria-hidden="true">🔔</span>
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
                        <div className="notifications-modal__empty">No tienes notificaciones por ahora.</div>
                    ) : null}
                    {!loading && sortedItems.length > 0 ? (
                        <div className="notifications-modal__list">
                            {sortedItems.map((notification) => {
                                const target = getNotificationTarget(notification, primaryRole);
                                const isUnread = !notification.read_at;
                                return (
                                    <article
                                        key={notification.notification_id}
                                        className={`notifications-modal__item ${isUnread ? 'is-unread' : ''}`}
                                    >
                                        <strong>{normalizeBackendText(notification.title, 'Notificación')}</strong>
                                        <p>{normalizeBackendText(notification.message, 'Sin detalle disponible.')}</p>
                                        <small>{formatDateTime(notification.created_at)}</small>
                                        <div className="notifications-modal__actions">
                                            {isUnread ? (
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
                                            {target ? (
                                                <button
                                                    type="button"
                                                    disabled={workingId === notification.notification_id}
                                                    onClick={() => {
                                                        handleMarkAsRead(notification, true).catch(() => undefined);
                                                    }}
                                                >
                                                    Ver
                                                </button>
                                            ) : null}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
            </Modal>
        </>
    );
}
