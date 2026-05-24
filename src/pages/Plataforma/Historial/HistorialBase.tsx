import { useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { QuestionnaireReportDetailModal } from '../../../components/questionnaires/QuestionnaireReportDetailModal';
import { useQuestionnaireHistoryV2 } from '../../../hooks/questionnaires/useQuestionnaireHistoryV2';
import type { QuestionnaireHistoryItemV2DTO } from '../../../services/questionnaires/questionnaires.types';
import {
    formatDateTimeEsCO,
    getModeLabel,
    getRoleLabel,
    getStatusLabel
} from '../../../utils/presentation/naturalLanguage';
import { normalizeBackendText } from '../../../utils/questionnaires/presentation';
import './HistorialBase.css';

type HistorialRole = 'padre' | 'psicologo';

interface HistorialBaseProps {
    role: HistorialRole;
}

const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'draft', label: 'Borrador' },
    { value: 'in_progress', label: 'En progreso' },
    { value: 'submitted', label: 'Enviado' },
    { value: 'processed', label: 'Procesado' },
    { value: 'failed', label: 'Fallido' },
    { value: 'archived', label: 'Archivado' }
];

const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' }
];

function resolveSessionTitle(item: QuestionnaireHistoryItemV2DTO, index: number) {
    const named = normalizeBackendText(item.title ?? item.name, '');
    if (named && named !== '--') return named;

    const mode = normalizeBackendText(getModeLabel(item.mode, ''), '');
    const status = normalizeBackendText(getStatusLabel(item.status, ''), '');
    if (mode && status) return `${mode} · ${status}`;

    return `Registro ${index + 1}`;
}

function resolveHistoryCaseLabel(item: QuestionnaireHistoryItemV2DTO) {
    const caseRecord = item.case;
    const label = normalizeBackendText(
        caseRecord?.display_label ??
        caseRecord?.private_label ??
        item.case_display_label ??
        item.case_private_label ??
        item.case_label ??
        caseRecord?.case_public_id ??
        item.case_public_id,
        ''
    );

    return label ? `Caso: ${label}` : 'Sin caso asociado';
}

export function HistorialBase({ role }: Readonly<HistorialBaseProps>) {
    const {
        items,
        page,
        pageSize,
        total,
        pages,
        statusFilter,
        loading,
        error,
        setPage,
        setStatusFilter,
        changePageSize,
        reload
    } = useQuestionnaireHistoryV2();

    const [detailSessionId, setDetailSessionId] = useState<string | null>(null);

    const title = 'Historial de cuestionarios';
    const historyContextLabel = role === 'psicologo' ? 'psicólogo' : 'padre o tutor';
    const totalPages = Math.max(1, pages);
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const showFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const showTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

    const historyRowsContent = useMemo(() => {
        if (loading) {
            return <div className="historial-v2-empty">Cargando historial...</div>;
        }

        if (items.length === 0) {
            return <div className="historial-v2-empty">No hay sesiones para mostrar.</div>;
        }

        return items.map((item: QuestionnaireHistoryItemV2DTO, index) => {
            const sessionTitle = resolveSessionTitle(item, index);
            const caseLabel = resolveHistoryCaseLabel(item);

            return (
                <div className="historial-v2-row" key={item.id}>
                    <div className="historial-v2-primary-cell" title={`${sessionTitle}\n${caseLabel}`}>
                        <strong className="historial-v2-primary-title">{sessionTitle}</strong>
                        <span className="historial-v2-case-ref">{caseLabel}</span>
                    </div>
                    <div>{normalizeBackendText(getStatusLabel(item.status), '--')}</div>
                    <div>{normalizeBackendText(getModeLabel(item.mode), '--')}</div>
                    <div>{normalizeBackendText(getRoleLabel(item.role), '--')}</div>
                    <div>{formatDateTimeEsCO(item.created_at)}</div>
                    <div>{formatDateTimeEsCO(item.updated_at)}</div>
                    <div className="historial-v2-actions">
                        <button type="button" className="historial-v2-btn" onClick={() => setDetailSessionId(item.id)}>
                            Ver
                        </button>
                    </div>
                </div>
            );
        });
    }, [items, loading]);

    return (
        <div className="plataforma-view">
            <section className="historial-v2" aria-label={`Historial de cuestionarios para ${historyContextLabel}`}>
                <div className="historial-v2-header">
                    <h1>{title}</h1>
                </div>

                <div className="historial-v2-divider" />

                <div className="historial-v2-controls">
                    <label>
                        Estado
                        <CustomSelect
                            value={statusFilter}
                            options={statusOptions}
                            onChange={setStatusFilter}
                            ariaLabel="Filtrar historial por estado"
                        />
                    </label>
                </div>

                {error ? <div className="historial-v2-alert error">{error}</div> : null}

                <div className="historial-v2-table">
                    <div className="historial-v2-head">
                        <div>Sesión</div>
                        <div>Estado</div>
                        <div>Modo</div>
                        <div>Rol</div>
                        <div>Creado</div>
                        <div>Actualizado</div>
                        <div>Acciones</div>
                    </div>
                    <div className="historial-v2-body">{historyRowsContent}</div>
                </div>

                <div className="historial-v2-pagination">
                    <div>Mostrando {showFrom}-{showTo} de {total}</div>
                    <div className="historial-v2-pagination-right">
                        <label>
                            Tamaño
                            <CustomSelect
                                value={String(pageSize)}
                                options={pageSizeOptions}
                                onChange={(value) => changePageSize(Number(value))}
                                ariaLabel="Cambiar tamaño de página de historial"
                            />
                        </label>
                        <button
                            type="button"
                            className="historial-v2-page-btn"
                            onClick={() => setPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage <= 1}
                            aria-label="Página anterior"
                        >
                            <span className="historial-v2-page-arrow" aria-hidden="true">‹</span>
                        </button>
                        <span>Página {currentPage} de {totalPages}</span>
                        <button
                            type="button"
                            className="historial-v2-page-btn"
                            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage >= totalPages}
                            aria-label="Página siguiente"
                        >
                            <span className="historial-v2-page-arrow" aria-hidden="true">›</span>
                        </button>
                    </div>
                </div>
            </section>

            <QuestionnaireReportDetailModal
                isOpen={detailSessionId !== null}
                sessionId={detailSessionId}
                role={role}
                onClose={() => setDetailSessionId(null)}
                onDataChanged={reload}
            />
        </div>
    );
}
