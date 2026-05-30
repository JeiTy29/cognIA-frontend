import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const historySource = () => readFileSync('src/pages/Plataforma/Historial/HistorialBase.tsx', 'utf8');
const historyCssSource = () => readFileSync('src/pages/Plataforma/Historial/HistorialBase.css', 'utf8');
const detailModalSource = () => readFileSync('src/components/questionnaires/QuestionnaireReportDetailModal.tsx', 'utf8');
const guardianCasesSource = () => readFileSync('src/pages/Plataforma/SeguimientoGuardian/SeguimientoGuardian.tsx', 'utf8');
const guardianCssSource = () => readFileSync('src/pages/Plataforma/SeguimientoGuardian/SeguimientoGuardian.css', 'utf8');
const chartsSource = () => readFileSync('src/components/DashboardCharts/index.tsx', 'utf8');
const apiSource = () => readFileSync('src/services/questionnaires/questionnaires.api.ts', 'utf8');
const solicitudesSource = () => readFileSync('src/pages/Plataforma/SolicitudesRevisionPsicologo/SolicitudesRevisionPsicologo.tsx', 'utf8');
const evaluacionesSource = () => readFileSync('src/pages/Plataforma/EvaluacionesCompartidas/EvaluacionesCompartidas.tsx', 'utf8');
const sidebarLayoutSource = () => readFileSync('src/components/SidebarLayout/SidebarLayout.tsx', 'utf8');

describe('frontend final dashboard copy and flows', () => {
    it('usa envio directo a psicologo y no enlace como flujo principal en historial', () => {
        const source = historySource();
        expect(source).toContain('Enviar a psic\u00f3logo');
        expect(source).toContain('searchPsychologistsV2');
        expect(source).toContain('shareQuestionnaireWithPsychologistV2');
        expect(source).not.toContain('Generar enlace');
        expect(source).not.toContain('Max usos');
        expect(source).not.toContain('Usuario destinatario autorizado');
    });

    it('mantiene historial como cuestionarios, filtros visibles y paginacion horizontal', () => {
        const source = historySource();
        const css = historyCssSource();
        expect(source).toContain('Historial de cuestionarios');
        expect(source).toContain('Consulta cuestionarios aplicados, resultados orientativos y evoluci\u00f3n por caso.');
        expect(source).toContain('Cuestionarios por caso');
        expect(source).toContain('P\u00e1gina {history.page} de');
        expect(css).toContain('.historial-dashboard-pagination');
        expect(css).toContain('flex-wrap: wrap');
        expect(source).not.toContain('Seguimiento por casos');
        expect(source).not.toContain('Sesiones por caso');
    });

    it('no deja mojibake visible ni flujo de enlace en el detalle alterno de cuestionario', () => {
        const source = detailModalSource();
        const visibleSection = source.slice(source.indexOf('const handleSearchPsychologists'));
        expect(visibleSection).not.toMatch(/[\u00c3\u00c2]|\u00e2\u20ac/);
        expect(visibleSection).toContain('psic\u00f3logos');
        expect(visibleSection).toContain('evaluaci\u00f3n');
        expect(visibleSection).toContain('Descargar PDF');
        expect(visibleSection).not.toContain('Generar enlace');
        expect(visibleSection).not.toContain('Max usos');
    });

    it('envia a psicologo con payload directo y carga revisiones profesionales visibles', () => {
        const source = detailModalSource();
        expect(source).toContain('getQuestionnaireProfessionalReviewsV2');
        expect(source).toContain('grantee_user_id: selectedPsychologistId');
        expect(source).toContain('grant_can_download_pdf: true');
        expect(source).toContain('grant_can_tag: false');
        expect(source).toContain("share_scope: 'session'");
        expect(source).toContain('Revisi\u00f3n profesional');
        expect(source).toContain('no constituye diagn\u00f3stico definitivo');
    });

    it('solo permite descargar PDF cuando el cuestionario esta procesado', () => {
        const history = historySource();
        const detail = detailModalSource();
        expect(history).toContain('canDownloadPdfForStatus');
        expect(history).toContain("toLowerCase() === 'processed'");
        expect(history).toContain('Disponible cuando el cuestionario esté procesado.');
        expect(history).toContain('disabled={pdfWorking || !canDownloadDetailPdf}');
        expect(detail).toContain('canDownloadPdfForStatus');
        expect(detail).toContain("toLowerCase() === 'processed'");
        expect(detail).toContain('El reporte PDF estará disponible cuando el cuestionario esté procesado.');
        expect(detail).toContain('disabled={pdfWorking || !canDownloadDetailPdf}');
    });

    it('humaniza el detalle y no muestra labels internos en ingles como copy visible', () => {
        const source = detailModalSource();
        const renderSection = source.slice(source.indexOf('return ('), source.indexOf('export'));
        const history = historySource();
        expect(source).toContain('Requiere derivaci\u00f3n urgente');
        expect(source).toContain('Nivel de se\u00f1al de seguridad');
        expect(source).toContain('\u00cdndice de carga sintom\u00e1tica');
        expect(history).toContain('Requiere derivaci\u00f3n urgente');
        expect(history).toContain('Nivel de se\u00f1al de seguridad');
        expect(history).toContain('\u00cdndice de carga sintom\u00e1tica');
        expect(history).toContain('diagn\u00f3stica');
        expect(history).toContain('evaluaci\u00f3n');
        expect(renderSection).not.toMatch(/urgent referral recommended|safety signal level|score type|symptom load index/i);
        expect(history).not.toMatch(/URGENT REFERRAL RECOMMENDED|SAFETY SIGNAL LEVEL|SCORE TYPE|SYMPTOM LOAD INDEX/);
    });

    it('guia el siguiente paso despues de crear caso', () => {
        const source = guardianCasesSource();
        expect(source).toContain('createdCaseFollowUp');
        expect(source).toContain('Añadir cuestionarios');
        expect(source).toContain('Asignar etiqueta desde cuestionario');
        expect(source).toContain('Ver detalle');
        expect(source).toContain('Cuestionarios por caso');
        expect(source).not.toContain('Sesiones por caso');
    });

    it('usa listados adaptativos y prioridades sin grillas rigidas', () => {
        const css = guardianCssSource();
        expect(css).toContain('Adaptive polish');
        expect(css).toContain('.seguimiento-case-list');
        expect(css).toContain('flex-direction: column');
        expect(css).toContain('.seguimiento-priority-card');
        expect(css).toContain('grid-template-columns: auto minmax(0, 1fr) auto');
    });

    it('dashboard inicia con datos amplios y sin timeout invasivo', () => {
        const source = guardianCasesSource();
        expect(source).toContain("useState('6')");
        expect(source).toContain("useState<CaseStatusFilter>('all')");
        expect(source).toContain('Mostrando \u00faltimos 6 meses');
        expect(source).not.toContain('Los casos se cargaron correctamente, pero el resumen visual tard\u00f3 demasiado');
    });

    it('charts limitan rankings y evitan labels largos como eje principal', () => {
        const source = chartsSource();
        expect(source).toContain('limitRankedItems(data, 5)');
        expect(source).toContain('Otros casos');
        expect(source).toContain('fullLabel');
        expect(source).toContain('minHeight: Math.max');
        expect(source).not.toContain('+${rest.length} m\u00e1s');
    });

    it('integra respuestas detalladas para guardian y psicologo aceptado', () => {
        expect(apiSource()).toContain('/api/v2/questionnaires/history/${sessionId}/responses');
        expect(historySource()).toContain('getQuestionnaireHistoryResponsesV2');
        expect(detailModalSource()).toContain('getQuestionnaireHistoryResponsesV2');
        expect(evaluacionesSource()).toContain('getQuestionnaireHistoryResponsesV2');
        expect(historySource()).toContain('Respuestas registradas');
        expect(detailModalSource()).toContain('Respuestas registradas');
        expect(evaluacionesSource()).toContain('Respuestas registradas');
    });

    it('usa resultados normalizados y evita strings crudos indice/riesgo', () => {
        const api = apiSource();
        const history = historySource();
        expect(api).toContain('primary_domain');
        expect(api).toContain('observed_indicators');
        expect(history).toContain('Resultados por dominio');
        expect(history).not.toContain('indice=');
        expect(history).not.toContain('riesgo=');
    });

    it('solicitudes de psicologo consumen charts del backend y no doble hero', () => {
        const source = solicitudesSource();
        expect(source).toContain('dashboardCharts');
        expect(source).toContain('by_status');
        expect(source).toContain('by_alert_level');
        expect(source).toContain('by_domain');
        expect(source).toContain('over_time');
        expect(source).toContain('pending_age');
        expect(source).toContain('solicitudes-revision__header-insight');
        expect(source).not.toContain('className="solicitudes-revision__insight"');
    });

    it('muestra rol actual en espanol sin enums internos visibles', () => {
        const source = sidebarLayoutSource();
        expect(source).toContain('Padre/Tutor');
        expect(source).toContain('Psicólogo');
        expect(source).toContain('Administrador');
        expect(source).toContain('app-current-role');
    });
});
