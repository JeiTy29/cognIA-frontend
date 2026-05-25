export interface NotificationDTO {
    notification_id: string;
    type?: string | null;
    title?: string | null;
    message?: string | null;
    case_public_id?: string | null;
    session_id?: string | null;
    grant_id?: string | null;
    read_at?: string | null;
    created_at?: string | null;
    [key: string]: unknown;
}

export interface NotificationsResponseDTO {
    items: NotificationDTO[];
    summary: {
        unread_count?: number | null;
        [key: string]: unknown;
    } | null;
    pagination: {
        page: number;
        page_size: number;
        total: number;
        pages: number;
    };
}
