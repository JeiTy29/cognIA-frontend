import autoTable from 'jspdf-autotable';
import type {
    QuestionnaireClinicalSummaryV2DTO,
    QuestionnaireHistoryDetailV2DTO,
    QuestionnaireQuestionV2DTO,
    QuestionnaireSecureResultsV2DTO,
    QuestionnaireSessionV2DTO
} from '../../services/questionnaires/questionnaires.types';
import { ADMIN_REPORT_THEME } from './adminReportTheme';
import { drawBarChart, drawHorizontalBarChart, type ReportChartPoint } from './chartDrawing';
import {
    addBulletList,
    addDataTable,
    addNoticeBox,
    addParagraph,
    addSectionTitle,
    createReportContext,
    ensureReportPageSpace,
    type ReportContext
} from './pdfBase';
import { buildQuestionnaireAlertReportDataset, type QuestionnaireAlertReportDataset } from './questionnaireReportData';
import { formatReportDateTime, formatReportNumber } from './reportFormatting';
import { normalizePdfTableCell, normalizePdfText } from './reportTextNormalization';
import { getModeLabel, getRoleLabel, getStatusLabel } from '../presentation/naturalLanguage';

type BuildQuestionnaireAlertPdfArgs = {
    sessionId: string;
    results: QuestionnaireSecureResultsV2DTO | null;
    clinicalSummary: QuestionnaireClinicalSummaryV2DTO | null;
    sessionDetail: QuestionnaireHistoryDetailV2DTO | null;
    sessionSnapshot: QuestionnaireSessionV2DTO | null;
    sessionQuestions: QuestionnaireQuestionV2DTO[];
};

function buildQuestionnaireAlertPdfFilename(
    session?: { updated_at?: string | null; created_at?: string | null; role?: string | null } | null
) {
    const source = session?.updated_at ?? session?.created_at ?? new Date().toISOString();
    const date = new Date(source);
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const yyyy = safeDate.getFullYear();
    const mm = String(safeDate.getMonth() + 1).padStart(2, '0');
    const dd = String(safeDate.getDate()).padStart(2, '0');
    const isGuardian = String(session?.role ?? '').trim().toLowerCase() === 'guardian';
    return isGuardian
        ? `Reporte CognIA - Alerta padre tutor - ${yyyy}-${mm}-${dd}.pdf`
        : `Reporte CognIA - Alerta - ${yyyy}-${mm}-${dd}.pdf`;
}

function addQuestionnaireCover(
    context: ReportContext,
    options: {
        generatedAt: string;
        modeLabel: string;
        roleLabel: string;
        statusLabel: string;
        versionLabel: string;
        answeredCount: number;
        totalQuestions: number;
    }
) {
    const { doc, pageWidth, pageHeight, marginX } = context;
    const colors = ADMIN_REPORT_THEME.colors;

    doc.setFillColor(248, 251, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    doc.setFillColor(223, 240, 255);
    doc.circle(pageWidth - 18, 26, 30, 'F');
    doc.setFillColor(220, 252, 231);
    doc.circle(24, pageHeight - 28, 24, 'F');

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginX, 28, pageWidth - marginX * 2, 58, 6, 6, 'F');

    doc.setTextColor(colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(normalizePdfText('CognIA'), marginX, 20);

    doc.setTextColor(colors.ink);
    doc.setFontSize(19);
    doc.text(normalizePdfText('Informe orientativo de resultados'), marginX, 44);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text(
        doc.splitTextToSize(
            normalizePdfText('Resultado de tamizaje y apoyo a revisión profesional.'),
            pageWidth - marginX * 2 - 4
        ),
        marginX,
        52
    );

    autoTable(doc, {
        startY: 64,
        margin: { left: marginX, right: marginX },
        theme: 'plain',
        body: [
            [normalizePdfText('Generado'), normalizePdfText(options.generatedAt, '--')],
            [normalizePdfText('Perfil'), normalizePdfText(options.roleLabel, '--')],
            [normalizePdfText('Modo'), normalizePdfText(options.modeLabel, '--')],
            [normalizePdfText('Versión'), normalizePdfText(options.versionLabel, '--')],
            [normalizePdfText('Estado'), normalizePdfText(options.statusLabel, '--')],
            [normalizePdfText('Respuestas registradas'), `${formatReportNumber(options.answeredCount)} de ${formatReportNumber(options.totalQuestions)}`]
        ],
        styles: {
            font: 'helvetica',
            fontSize: 9.5,
            textColor: colors.ink
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 44, textColor: colors.muted },
            1: { cellWidth: 'auto' }
        }
    });

    const finalY = ((doc as typeof doc & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 110);
    doc.setFillColor(223, 240, 255);
    doc.roundedRect(marginX, finalY + 4, pageWidth - marginX * 2, 18, 5, 5, 'F');
    doc.setTextColor(colors.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(normalizePdfText('Uso responsable'), marginX + 4, finalY + 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
        normalizePdfText('Este reporte es orientativo y no reemplaza una evaluación profesional.'),
        marginX + 4,
        finalY + 17
    );

    context.cursorY = finalY + 28;
}

function addQuestionnaireFooter(context: ReportContext) {
    const { doc, pageWidth, pageHeight, marginX } = context;
    const pageCount = doc.getNumberOfPages();

    for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(219, 231, 243);
        doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(82, 100, 118);
        doc.text(normalizePdfText('Reporte CognIA - Alerta orientativa'), marginX, pageHeight - 7);
        doc.text(
            normalizePdfText('Este reporte es orientativo y no reemplaza una evaluación profesional.'),
            pageWidth / 2,
            pageHeight - 7,
            { align: 'center' }
        );
        doc.text(normalizePdfText(`Página ${page} de ${pageCount}`), pageWidth - marginX, pageHeight - 7, { align: 'right' });
    }
}

function drawCompletionBar(context: ReportContext, ratio: number, answeredCount: number, totalQuestions: number) {
    addSectionTitle(context, 'Completitud del cuestionario');
    addParagraph(
        context,
        'Esta gráfica indica qué proporción del cuestionario fue respondida durante la sesión.'
    );

    ensureReportPageSpace(context, 24);
    const { doc, marginX, pageWidth } = context;
    const width = pageWidth - marginX * 2;
    const barY = context.cursorY + 4;
    const barWidth = width;
    const progressWidth = Math.max(0, Math.min(1, ratio)) * barWidth;

    doc.setFillColor(248, 251, 255);
    doc.roundedRect(marginX, barY, barWidth, 8, 4, 4, 'F');
    doc.setFillColor(11, 111, 184);
    doc.roundedRect(marginX, barY, progressWidth, 8, 4, 4, 'F');
    doc.setTextColor(11, 37, 64);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(
        `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)} % (${formatReportNumber(answeredCount)} de ${formatReportNumber(totalQuestions)} respuestas)`,
        marginX,
        barY + 15
    );

    context.cursorY = barY + 20;
}

function buildDomainChartPoints(dataset: QuestionnaireAlertReportDataset): ReportChartPoint[] {
    return dataset.domainRows
        .filter((row) => row.probabilityValue !== null)
        .map((row) => ({
            label: row.domainLabel,
            value: row.probabilityValue ?? 0
        }));
}

function buildAnsweredByDomainChartPoints(dataset: QuestionnaireAlertReportDataset): ReportChartPoint[] {
    return dataset.answeredQuestionsByDomain.map((row) => ({
        label: row.label,
        value: row.value
    }));
}

function buildImpactDistributionChartPoints(dataset: QuestionnaireAlertReportDataset): ReportChartPoint[] {
    return dataset.impactDistribution.map((row) => ({
        label: row.label,
        value: row.count
    }));
}

function addAnsweredQuestionsTable(context: ReportContext, dataset: QuestionnaireAlertReportDataset) {
    addSectionTitle(context, 'Preguntas respondidas');
    addParagraph(
        context,
        'Esta tabla lista las preguntas contestadas durante la sesión, la respuesta registrada y una interpretación descriptiva según la escala disponible. Debe leerse como apoyo orientativo y no como diagnóstico individual.'
    );

    if (dataset.answeredQuestionsNotice) {
        addNoticeBox(context, 'Disponibilidad de preguntas', dataset.answeredQuestionsNotice, 'warning');
    }

    if (dataset.answeredQuestions.length === 0) {
        addNoticeBox(
            context,
            'Preguntas no disponibles',
            'No fue posible recuperar el detalle de preguntas contestadas para esta sesión.',
            'warning'
        );
        return;
    }

    autoTable(context.doc, {
        startY: context.cursorY,
        margin: { left: context.marginX, right: context.marginX, bottom: 20 },
        head: [['#', 'Sección', 'Dominio', 'Pregunta', 'Respuesta', 'Impacto']],
        body: dataset.answeredQuestions.map((row) => [
            normalizePdfTableCell(formatReportNumber(row.index)),
            normalizePdfTableCell(row.sectionLabel, 'General'),
            normalizePdfTableCell(row.domainLabel, 'General'),
            normalizePdfTableCell(row.questionText, '--'),
            normalizePdfTableCell(row.answerLabel, '--'),
            normalizePdfTableCell(row.impactDescription, '--')
        ]),
        theme: 'grid',
        headStyles: {
            fillColor: ADMIN_REPORT_THEME.colors.primary,
            textColor: '#ffffff',
            fontStyle: 'bold'
        },
        styles: {
            font: 'helvetica',
            fontSize: 7.6,
            cellPadding: 2,
            overflow: 'linebreak',
            textColor: ADMIN_REPORT_THEME.colors.ink,
            valign: 'top'
        },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 22 },
            2: { cellWidth: 20 },
            3: { cellWidth: 60 },
            4: { cellWidth: 26 },
            5: { cellWidth: 'auto' }
        }
    });

    context.cursorY =
        (((context.doc as typeof context.doc & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY) ?? context.cursorY) + 5;
}

export async function buildQuestionnaireAlertPdf({
    sessionId,
    results,
    clinicalSummary,
    sessionDetail,
    sessionSnapshot,
    sessionQuestions
}: BuildQuestionnaireAlertPdfArgs): Promise<Blob> {
    const mergedSessionSource = {
        ...(sessionSnapshot ?? {}),
        ...(sessionDetail ?? {}),
        answers:
            sessionDetail?.answers ??
            sessionSnapshot?.answers ??
            null
    } as QuestionnaireHistoryDetailV2DTO | QuestionnaireSessionV2DTO | null;

    const dataset = buildQuestionnaireAlertReportDataset({
        sessionDetail: mergedSessionSource,
        sessionQuestions,
        results,
        clinicalSummary
    });

    if (import.meta.env.DEV) {
        console.debug('[questionnaire-pdf] dataset', {
            sessionId,
            domains: dataset.domainRows.length,
            answeredQuestions: dataset.answeredQuestions.length,
            answeredByDomain: dataset.answeredQuestionsByDomain.length,
            impactDistribution: dataset.impactDistribution.length
        });
    }

    const context = createReportContext('Reporte CognIA - Alerta orientativa');
    const roleSource = sessionSnapshot?.role ?? sessionDetail?.role ?? results?.session?.role ?? 'guardian';
    const modeSource = sessionSnapshot?.mode ?? sessionDetail?.mode ?? results?.session?.mode ?? null;
    const versionSource =
        sessionSnapshot?.version ??
        sessionDetail?.version ??
        results?.session?.version ??
        clinicalSummary?.report_version ??
        '--';

    addQuestionnaireCover(context, {
        generatedAt: formatReportDateTime(new Date()),
        modeLabel: getModeLabel(modeSource, '--'),
        roleLabel: getRoleLabel(roleSource, 'Padre o tutor'),
        statusLabel: getStatusLabel(sessionSnapshot?.status ?? sessionDetail?.status ?? results?.session?.status, '--'),
        versionLabel: normalizePdfText(versionSource, '--'),
        answeredCount: dataset.completion.answeredCount,
        totalQuestions: dataset.completion.totalQuestions
    });

    addSectionTitle(context, 'Resumen general');
    addParagraph(context, dataset.summaryText);
    addParagraph(context, dataset.recommendationText);
    addNoticeBox(context, 'Aclaración importante', dataset.clarificationText, 'info');

    drawCompletionBar(
        context,
        dataset.completion.ratio,
        dataset.completion.answeredCount,
        dataset.completion.totalQuestions
    );

    addDataTable(context, {
        title: 'Resumen de sesión',
        description:
            'Esta tabla resume el contexto general de la sesión, incluyendo perfil, modo, estado visible y nivel de completitud alcanzado durante el cuestionario.',
        head: ['Indicador', 'Valor'],
        body: [
            ['Perfil que respondió', dataset.completion.roleLabel],
            ['Modo', dataset.completion.modeLabel],
            ['Estado', dataset.completion.statusLabel],
            ['Versión', normalizePdfText(versionSource, '--')],
            ['Preguntas respondidas', `${formatReportNumber(dataset.completion.answeredCount)} de ${formatReportNumber(dataset.completion.totalQuestions)}`],
            ['Completitud', dataset.completion.ratioLabel]
        ]
    });

    if (dataset.sectionNarratives.length > 0) {
        addSectionTitle(context, 'Resumen por secciones');
        addParagraph(
            context,
            'Las siguientes secciones sintetizan la lectura orientativa del cuestionario con base en la información narrativa disponible.'
        );
        dataset.sectionNarratives.forEach((section) => {
            addParagraph(context, `${normalizePdfText(section.title)}: ${normalizePdfText(section.content)}`);
        });
    } else if (dataset.sectionSummaryRows.length > 0) {
        addDataTable(context, {
            title: 'Resumen por secciones',
            description:
                'Esta tabla muestra cuántas respuestas registradas se asociaron con cada sección disponible del cuestionario durante la sesión.',
            head: ['Sección', 'Respuestas registradas'],
            body: dataset.sectionSummaryRows.map((row) => [row.sectionLabel, formatReportNumber(row.answeredCount)])
        });
    }

    const domainChartPoints = buildDomainChartPoints(dataset);
    if (domainChartPoints.length > 0) {
        drawHorizontalBarChart(context, {
            title: 'Compatibilidad por dominio',
            description:
                'Esta gráfica resume el nivel de compatibilidad estimado por dominio evaluado. Los valores se expresan como porcentaje y deben interpretarse como apoyo orientativo, no como diagnóstico.',
            points: domainChartPoints,
            percent: true
        });
    } else {
        addNoticeBox(context, 'Compatibilidad por dominio', 'No hay datos suficientes para generar esta gráfica.', 'info');
    }

    const answeredByDomainPoints = buildAnsweredByDomainChartPoints(dataset);
    if (answeredByDomainPoints.length > 0) {
        drawHorizontalBarChart(context, {
            title: 'Preguntas respondidas por dominio',
            description:
                'Esta gráfica muestra cuántas preguntas contestadas se relacionan con cada dominio. Ayuda a entender qué áreas tuvieron mayor cantidad de información registrada.',
            points: answeredByDomainPoints
        });
    } else {
        addNoticeBox(context, 'Preguntas respondidas por dominio', 'No hay suficientes preguntas respondidas para generar esta gráfica.', 'info');
    }

    const impactDistributionPoints = buildImpactDistributionChartPoints(dataset);
    if (impactDistributionPoints.length > 0) {
        drawBarChart(context, {
            title: 'Distribución interpretativa de respuestas',
            description:
                'Esta gráfica resume cómo se distribuyen las respuestas según su intensidad descriptiva dentro de la escala disponible para cada pregunta.',
            points: impactDistributionPoints
        });
    } else {
        addNoticeBox(context, 'Distribución interpretativa de respuestas', 'No hay suficientes respuestas para generar esta gráfica.', 'info');
    }

    addDataTable(context, {
        title: 'Resultados por dominio',
        description:
            'Esta tabla muestra la probabilidad estimada, el nivel visible y la banda de confianza reportada para cada dominio evaluado en la sesión.',
        head: ['Dominio', 'Probabilidad', 'Nivel', 'Confianza'],
        body: dataset.domainRows.length > 0
            ? dataset.domainRows.map((row) => [
                row.domainLabel,
                row.probabilityLabel,
                row.levelLabel,
                row.confidenceLabel
            ])
            : [['Sin dominios disponibles', '--', '--', '--']]
    });

    addAnsweredQuestionsTable(context, dataset);

    addSectionTitle(context, 'Limitaciones y uso responsable');
    addBulletList(context, [
        'El impacto por pregunta es una orientación descriptiva según la escala de respuesta; no representa un diagnóstico individual.',
        'Los porcentajes y niveles deben interpretarse junto con el conjunto completo de respuestas y el contexto del niño o niña.',
        'Este reporte es orientativo y no reemplaza una evaluación profesional.'
    ]);
    addParagraph(context, dataset.disclaimerText);

    addQuestionnaireFooter(context);
    return context.doc.output('blob');
}

export function buildQuestionnaireAlertPdfFileName(
    session?: { updated_at?: string | null; created_at?: string | null; role?: string | null } | null
) {
    return buildQuestionnaireAlertPdfFilename(session);
}
