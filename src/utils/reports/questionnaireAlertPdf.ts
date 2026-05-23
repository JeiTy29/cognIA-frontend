import autoTable from 'jspdf-autotable';
import type { QuestionnaireClinicalSummaryV2DTO, QuestionnaireHistoryDetailV2DTO, QuestionnaireQuestionV2DTO, QuestionnaireSecureResultsV2DTO, QuestionnaireSessionV2DTO } from '../../services/questionnaires/questionnaires.types';
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
import {
    buildQuestionnaireAlertReportDataset,
    type QuestionnaireAlertReportDataset
} from './questionnaireReportData';
import {
    formatReportDateTime,
    formatReportNumber,
    formatReportPercent
} from './reportFormatting';
import { getModeLabel, getRoleLabel } from '../presentation/naturalLanguage';

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
    doc.roundedRect(marginX, 34, pageWidth - marginX * 2, 66, 6, 6, 'F');

    doc.setTextColor(colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('CognIA', marginX, 22);

    doc.setTextColor(colors.ink);
    doc.setFontSize(20);
    doc.text('Reporte de alerta orientativa', marginX, 52);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(
        'Resumen interpretativo de resultados, dominios evaluados y respuestas registradas para apoyo de revisión responsable.',
        marginX,
        60,
        { maxWidth: pageWidth - marginX * 2 - 4 }
    );

    autoTable(doc, {
        startY: 74,
        margin: { left: marginX, right: marginX },
        theme: 'plain',
        body: [
            ['Generado', options.generatedAt],
            ['Perfil', options.roleLabel],
            ['Modo', options.modeLabel],
            ['Estado', options.statusLabel],
            ['Respuestas registradas', `${formatReportNumber(options.answeredCount)} de ${formatReportNumber(options.totalQuestions)}`]
        ],
        styles: {
            font: 'helvetica',
            fontSize: 10,
            textColor: colors.ink
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 46, textColor: colors.muted },
            1: { cellWidth: 'auto' }
        }
    });

    const finalY = ((doc as typeof doc & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 112);
    doc.setFillColor(223, 240, 255);
    doc.roundedRect(marginX, finalY + 8, pageWidth - marginX * 2, 24, 5, 5, 'F');
    doc.setTextColor(colors.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Uso responsable', marginX + 4, finalY + 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(
        'Este reporte es orientativo y no reemplaza una evaluación profesional.',
        marginX + 4,
        finalY + 24
    );

    context.doc.addPage();
    context.cursorY = 20;
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
        doc.text('Reporte CognIA - Alerta orientativa', marginX, pageHeight - 7);
        doc.text(
            'Este reporte es orientativo y no reemplaza una evaluación profesional.',
            pageWidth / 2,
            pageHeight - 7,
            { align: 'center' }
        );
        doc.text(`Página ${page} de ${pageCount}`, pageWidth - marginX, pageHeight - 7, { align: 'right' });
    }
}

function drawCompletionBar(context: ReportContext, ratio: number, answeredCount: number, totalQuestions: number) {
    addSectionTitle(context, 'Completitud del cuestionario');
    addParagraph(
        context,
        'Esta gráfica indica qué proporción del cuestionario fue respondida durante la sesión.'
    );

    ensureReportPageSpace(context, 28);
    const { doc, marginX, pageWidth } = context;
    const width = pageWidth - marginX * 2;
    const barY = context.cursorY + 6;
    const barWidth = width;
    const progressWidth = Math.max(0, Math.min(1, ratio)) * barWidth;

    doc.setFillColor(248, 251, 255);
    doc.roundedRect(marginX, barY, barWidth, 10, 4, 4, 'F');
    doc.setFillColor(11, 111, 184);
    doc.roundedRect(marginX, barY, progressWidth, 10, 4, 4, 'F');
    doc.setTextColor(11, 37, 64);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(
        `${formatReportPercent(ratio, '0 %')} (${formatReportNumber(answeredCount)} de ${formatReportNumber(totalQuestions)} respuestas)`,
        marginX,
        barY + 18
    );

    context.cursorY = barY + 24;
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
        'Esta tabla resume las preguntas contestadas durante la sesión, la respuesta registrada y una interpretación descriptiva según la escala disponible. Debe leerse como apoyo orientativo y no como diagnóstico individual.'
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
        head: [['#', 'Sección', 'Dominio', 'Pregunta', 'Respuesta', 'Normalización', 'Impacto']],
        body: dataset.answeredQuestions.map((row) => [
            formatReportNumber(row.index),
            row.sectionLabel,
            row.domainLabel,
            row.questionText,
            row.answerLabel,
            `${row.normalizedAnswerLabel} · ${row.responseTypeLabel}`,
            row.impactDescription
        ]),
        theme: 'grid',
        headStyles: {
            fillColor: ADMIN_REPORT_THEME.colors.primary,
            textColor: '#ffffff',
            fontStyle: 'bold'
        },
        styles: {
            font: 'helvetica',
            fontSize: 7.4,
            cellPadding: 2.2,
            overflow: 'linebreak',
            textColor: ADMIN_REPORT_THEME.colors.ink,
            valign: 'top'
        },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 24 },
            2: { cellWidth: 22 },
            3: { cellWidth: 54 },
            4: { cellWidth: 24 },
            5: { cellWidth: 28 },
            6: { cellWidth: 'auto' }
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
    const dataset = buildQuestionnaireAlertReportDataset({
        sessionDetail: sessionSnapshot ?? sessionDetail,
        sessionQuestions,
        results,
        clinicalSummary
    });

    const context = createReportContext('Reporte CognIA - Alerta orientativa');
    const roleSource = sessionSnapshot?.role ?? sessionDetail?.role ?? results?.session?.role ?? 'guardian';
    const modeSource = sessionSnapshot?.mode ?? sessionDetail?.mode ?? results?.session?.mode ?? null;

    addQuestionnaireCover(context, {
        generatedAt: formatReportDateTime(new Date()),
        modeLabel: getModeLabel(modeSource, '--'),
        roleLabel: getRoleLabel(roleSource, 'Padre o tutor'),
        statusLabel: dataset.completion.statusLabel,
        answeredCount: dataset.completion.answeredCount,
        totalQuestions: dataset.completion.totalQuestions
    });

    addSectionTitle(context, 'Resumen general');
    addParagraph(context, dataset.summaryText);
    addParagraph(context, dataset.recommendationText);
    addNoticeBox(
        context,
        'Aclaración importante',
        dataset.clarificationText,
        'info'
    );

    drawCompletionBar(
        context,
        dataset.completion.ratio,
        dataset.completion.answeredCount,
        dataset.completion.totalQuestions
    );

    addDataTable(context, {
        title: 'Resumen de sesión',
        description:
            'Esta tabla resume el contexto general de la sesión, incluyendo modo, perfil que respondió, estado visible y nivel de completitud alcanzado durante el cuestionario.',
        head: ['Indicador', 'Valor'],
        body: [
            ['Sesión', sessionId],
            ['Perfil que respondió', dataset.completion.roleLabel],
            ['Modo', dataset.completion.modeLabel],
            ['Estado', dataset.completion.statusLabel],
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
            addNoticeBox(context, section.title, section.content, 'info');
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
        addNoticeBox(
            context,
            'Compatibilidad por dominio',
            'No hay datos suficientes para generar esta gráfica.',
            'info'
        );
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

    const answeredByDomainPoints = buildAnsweredByDomainChartPoints(dataset);
    if (answeredByDomainPoints.length > 0) {
        drawHorizontalBarChart(context, {
            title: 'Preguntas respondidas por dominio',
            description:
                'Esta gráfica muestra cuántas preguntas contestadas se relacionan con cada dominio. Ayuda a entender qué áreas tuvieron mayor cantidad de información registrada.',
            points: answeredByDomainPoints
        });
    } else {
        addNoticeBox(
            context,
            'Preguntas respondidas por dominio',
            'No hay suficientes preguntas respondidas para generar esta gráfica.',
            'info'
        );
    }

    const impactDistributionPoints = buildImpactDistributionChartPoints(dataset);
    if (impactDistributionPoints.length > 0) {
        drawBarChart(context, {
            title: 'Distribución interpretativa de respuestas',
            description:
                'Esta gráfica resume cómo se distribuyen las respuestas según su intensidad descriptiva dentro de la escala disponible para cada pregunta.',
            points: impactDistributionPoints
        });
    }

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
