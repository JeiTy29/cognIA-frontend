import { getAllAuditLogs } from './audit';
import { getPsychologistRejectionReason, isPsychologistUser, resolvePsychologistReviewState, type PsychologistReviewState } from './psychologists';
import {
    getAdminQuestionnaires,
    type AdminQuestionnaireItem,
    type ListAdminQuestionnairesParams
} from './questionnaires';
import {
    getUsers,
    type User,
    type UsersListParams
} from './users';
import { getAdminProblemReports, type ProblemReportListParams } from '../problemReports/problemReports.api';
import type { ProblemReportItem } from '../problemReports/problemReports.types';

const MAX_REPORT_RECORDS = 5000;
const DEFAULT_PAGE_SIZE = 100;

type PaginatedResponse<TItem> = {
    items?: TItem[];
    pagination?: {
        page?: number;
        page_size?: number;
        total?: number;
        pages?: number;
    };
};

type PagedFetcher<TItem, TParams, TResponse extends PaginatedResponse<TItem>> = (
    params: TParams
) => Promise<TResponse>;

type PagedFetchOptions<TParams> = {
    limit: number | 'all';
    pageSize?: number;
    maxRecords?: number;
    buildParams: (page: number, pageSize: number) => TParams;
};

export type ReportPsychologistRecord = User & {
    reviewState: PsychologistReviewState;
    reviewReason: string | null;
};

async function fetchPaginatedItems<TItem, TParams, TResponse extends PaginatedResponse<TItem>>(
    fetchPage: PagedFetcher<TItem, TParams, TResponse>,
    options: PagedFetchOptions<TParams>
) {
    const targetLimit = options.limit === 'all' ? Number.POSITIVE_INFINITY : Math.max(1, options.limit);
    const pageSize = Math.min(
        options.limit === 'all' ? DEFAULT_PAGE_SIZE : Math.max(1, Number(options.limit)),
        options.pageSize ?? DEFAULT_PAGE_SIZE
    );
    const maxRecords = options.maxRecords ?? MAX_REPORT_RECORDS;

    let page = 1;
    let pages = Number.POSITIVE_INFINITY;
    let totalAvailable: number | null = null;
    const collected: TItem[] = [];

    while (page <= pages && collected.length < targetLimit && collected.length < maxRecords) {
        const response = await fetchPage(options.buildParams(page, pageSize));
        const items = response.items ?? [];
        const pagination = response.pagination;

        collected.push(...items);

        if (pagination && typeof pagination.total === 'number') {
            totalAvailable = pagination.total;
        }

        if (items.length === 0) break;
        if (pagination && typeof pagination.pages === 'number' && pagination.pages > 0) {
            pages = pagination.pages;
            if (page >= pages) break;
        } else if (items.length < pageSize) {
            break;
        }

        if (collected.length >= targetLimit || collected.length >= maxRecords) {
            break;
        }

        page += 1;
    }

    const items = collected.slice(0, Math.min(targetLimit, maxRecords));
    return {
        items,
        totalAvailable: totalAvailable ?? items.length,
        truncated: collected.length >= maxRecords && options.limit === 'all'
    };
}

export async function fetchUsersForReport(config: {
    limit: number | 'all';
    role?: string;
    isActive?: boolean;
    orderBy: 'recent' | 'oldest' | 'username' | 'email';
    q?: string;
}) {
    const sortMap: Record<typeof config.orderBy, Pick<UsersListParams, 'sort' | 'order'>> = {
        recent: { sort: 'created_at', order: 'desc' },
        oldest: { sort: 'created_at', order: 'asc' },
        username: { sort: 'username', order: 'asc' },
        email: { sort: 'email', order: 'asc' }
    };

    return fetchPaginatedItems<User, UsersListParams, PaginatedResponse<User>>(getUsers, {
        limit: config.limit,
        buildParams: (page, pageSize) => ({
            page,
            page_size: pageSize,
            q: config.q || undefined,
            role: config.role && config.role !== 'all' ? config.role : undefined,
            is_active: typeof config.isActive === 'boolean' ? config.isActive : undefined,
            sort: sortMap[config.orderBy].sort,
            order: sortMap[config.orderBy].order
        })
    });
}

export async function fetchPsychologistsForReport(config: {
    limit: number | 'all';
    verification?: 'all' | 'pending' | 'approved' | 'rejected';
    isActive?: boolean;
}) {
    const usersResult = await fetchPaginatedItems<User, UsersListParams, PaginatedResponse<User>>(getUsers, {
        limit: 'all',
        buildParams: (page, pageSize) => ({
            page,
            page_size: pageSize,
            role: 'PSYCHOLOGIST',
            sort: 'created_at',
            order: 'desc'
        })
    });

    const normalized = usersResult.items
        .filter(isPsychologistUser)
        .map((user) => {
            const reviewState = resolvePsychologistReviewState(user) ?? (user.colpsic_verified ? 'approved' : 'pending');
            return {
                ...user,
                reviewState,
                reviewReason: getPsychologistRejectionReason(user)
            } satisfies ReportPsychologistRecord;
        })
        .filter((user) => {
            const matchesVerification =
                !config.verification ||
                config.verification === 'all' ||
                user.reviewState === config.verification;
            const matchesStatus =
                typeof config.isActive !== 'boolean' ||
                user.is_active === config.isActive;
            return matchesVerification && matchesStatus;
        });

    const targetLimit = config.limit === 'all' ? normalized.length : config.limit;
    return {
        items: normalized.slice(0, targetLimit),
        totalAvailable: normalized.length,
        truncated: config.limit === 'all' ? normalized.length >= MAX_REPORT_RECORDS : false
    };
}

export async function fetchQuestionnairesForReport(config: {
    limit: number | 'all';
    visibleOnly?: boolean;
    name?: string;
    version?: string;
    isActive?: boolean;
    isArchived?: boolean;
    sort?: string;
    order?: 'asc' | 'desc';
}) {
    return fetchPaginatedItems<
        AdminQuestionnaireItem,
        ListAdminQuestionnairesParams,
        PaginatedResponse<AdminQuestionnaireItem>
    >(getAdminQuestionnaires, {
        limit: config.limit,
        buildParams: (page, pageSize) => ({
            page,
            page_size: pageSize,
            name: config.name || undefined,
            version: config.version || undefined,
            is_active: config.isActive,
            is_archived: config.isArchived,
            sort: config.sort,
            order: config.order
        })
    });
}

export async function fetchProblemReportsForReport(config: {
    limit: number | 'all';
    status?: string;
    issueType?: string;
    reporterRole?: string;
    q?: string;
    fromDate?: string;
    toDate?: string;
    sort?: string;
    order?: 'asc' | 'desc';
}) {
    return fetchPaginatedItems<
        ProblemReportItem,
        ProblemReportListParams,
        PaginatedResponse<ProblemReportItem>
    >(getAdminProblemReports, {
        limit: config.limit,
        buildParams: (page, pageSize) => ({
            page,
            page_size: pageSize,
            status: config.status || undefined,
            issue_type: config.issueType || undefined,
            reporter_role: config.reporterRole || undefined,
            q: config.q || undefined,
            from_date: config.fromDate || undefined,
            to_date: config.toDate || undefined,
            sort: config.sort,
            order: config.order
        })
    });
}

export async function fetchAuditLogsForReport() {
    return getAllAuditLogs();
}
