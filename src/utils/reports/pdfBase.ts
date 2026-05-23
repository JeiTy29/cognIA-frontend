import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import { ADMIN_REPORT_THEME } from './adminReportTheme';
import { normalizePdfTableCell, normalizePdfText } from './reportTextNormalization';

export interface ReportSectionTable {
    title: string;
    description?: string;
    head: string[];
    body: RowInput[];
    note?: string;
    columnStyles?: Record<number, Record<string, unknown>>;
}

export interface ReportMetaItem {
    label: string;
    value: string;
}

export interface ReportContext {
    doc: jsPDF;
    cursorY: number;
    pageWidth: number;
    pageHeight: number;
    marginX: number;
    sectionTitle: string;
}

function ensurePageSpace(context: ReportContext, requiredHeight: number) {
    if (context.cursorY + requiredHeight <= context.pageHeight - 24) return;
    context.doc.addPage();
    context.cursorY = 20;
}

function normalizeRowInput(row: RowInput): RowInput {
    if (Array.isArray(row)) {
        return row.map((cell) => normalizePdfTableCell(cell, '--'));
    }
    if (row && typeof row === 'object') {
        return Object.fromEntries(
            Object.entries(row).map(([key, value]) => [key, normalizePdfTableCell(value, '--')])
        ) as RowInput;
    }
    return [normalizePdfTableCell(row, '--')];
}

export function ensureReportPageSpace(context: ReportContext, requiredHeight: number) {
    ensurePageSpace(context, requiredHeight);
}

export function createReportContext(sectionTitle: string) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true
    });

    return {
        doc,
        cursorY: 20,
        pageWidth: doc.internal.pageSize.getWidth(),
        pageHeight: doc.internal.pageSize.getHeight(),
        marginX: 16,
        sectionTitle: normalizePdfText(sectionTitle, 'Reporte CognIA')
    } satisfies ReportContext;
}

export function addReportCover(
    context: ReportContext,
    options: {
        title: string;
        subtitle: string;
        sectionLabel: string;
        generatedAt: string;
        metaItems: ReportMetaItem[];
    }
) {
    const { doc, pageWidth, pageHeight, marginX } = context;
    const colors = ADMIN_REPORT_THEME.colors;
    const title = normalizePdfText(options.title);
    const subtitle = normalizePdfText(options.subtitle);
    const sectionLabel = normalizePdfText(options.sectionLabel);
    const generatedAt = normalizePdfText(options.generatedAt);

    doc.setFillColor(248, 251, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    doc.setFillColor(223, 240, 255);
    doc.circle(pageWidth - 18, 24, 34, 'F');
    doc.setFillColor(220, 252, 231);
    doc.circle(20, pageHeight - 28, 28, 'F');

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginX, 38, pageWidth - marginX * 2, 58, 6, 6, 'F');

    doc.setTextColor(colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(normalizePdfText(ADMIN_REPORT_THEME.companyName), marginX, 22);

    doc.setTextColor(colors.ink);
    doc.setFontSize(20);
    doc.text(title, marginX, 54);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(subtitle, pageWidth - marginX * 2), marginX, 62);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(sectionLabel, marginX, 78);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generado: ${generatedAt}`, marginX, 85);

    autoTable(doc, {
        startY: 96,
        margin: { left: marginX, right: marginX },
        theme: 'plain',
        body: options.metaItems.map((item) => [
            normalizePdfText(item.label, '--'),
            normalizePdfText(item.value, '--')
        ]),
        styles: {
            font: 'helvetica',
            fontSize: 10,
            textColor: colors.ink
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 48, textColor: colors.muted },
            1: { cellWidth: 'auto' }
        }
    });

    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 126;
    doc.setFillColor(223, 240, 255);
    doc.roundedRect(marginX, finalY + 6, pageWidth - marginX * 2, 22, 5, 5, 'F');
    doc.setTextColor(colors.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Aviso de uso adecuado', marginX + 4, finalY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(
        'Documento administrativo interno. No divulgar sin autorización.',
        marginX + 4,
        finalY + 21
    );

    context.cursorY = finalY + 34;
}

export function addSectionTitle(context: ReportContext, title: string, subtitle?: string) {
    const normalizedTitle = normalizePdfText(title);
    const normalizedSubtitle = normalizePdfText(subtitle);
    ensurePageSpace(context, normalizedSubtitle ? 18 : 12);
    const { doc, marginX } = context;
    const colors = ADMIN_REPORT_THEME.colors;

    doc.setTextColor(colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(normalizedTitle, marginX, context.cursorY);
    context.cursorY += 6;

    if (normalizedSubtitle) {
        doc.setTextColor(colors.muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        const lines = doc.splitTextToSize(normalizedSubtitle, context.pageWidth - marginX * 2);
        doc.text(lines, marginX, context.cursorY);
        context.cursorY += lines.length * 4.5 + 2;
    } else {
        context.cursorY += 2;
    }
}

export function addParagraph(context: ReportContext, text: string) {
    const normalizedText = normalizePdfText(text);
    if (!normalizedText) return;
    ensurePageSpace(context, 12);
    const { doc, marginX } = context;
    const colors = ADMIN_REPORT_THEME.colors;
    doc.setTextColor(colors.ink);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(normalizedText, context.pageWidth - marginX * 2);
    doc.text(lines, marginX, context.cursorY);
    context.cursorY += lines.length * 4.5 + 3;
}

export function addBulletList(context: ReportContext, items: string[]) {
    if (items.length === 0) return;
    const { doc, marginX } = context;
    const colors = ADMIN_REPORT_THEME.colors;
    doc.setTextColor(colors.ink);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    for (const item of items) {
        const normalizedItem = normalizePdfText(item);
        if (!normalizedItem) continue;
        const lines = doc.splitTextToSize(`• ${normalizedItem}`, context.pageWidth - marginX * 2);
        ensurePageSpace(context, lines.length * 4.5 + 4);
        doc.text(lines, marginX, context.cursorY);
        context.cursorY += lines.length * 4.5 + 1.5;
    }

    context.cursorY += 2;
}

export function addNoticeBox(
    context: ReportContext,
    title: string,
    text: string,
    tone: 'info' | 'success' | 'warning' = 'info'
) {
    const normalizedTitle = normalizePdfText(title);
    const normalizedText = normalizePdfText(text);
    const fillColor =
        tone === 'success'
            ? ADMIN_REPORT_THEME.colors.accentSoft
            : tone === 'warning'
                ? ADMIN_REPORT_THEME.colors.warningSoft
                : ADMIN_REPORT_THEME.colors.primarySoft;

    const { doc, marginX, pageWidth } = context;
    const lines = doc.splitTextToSize(normalizedText, pageWidth - marginX * 2 - 8);
    const boxHeight = Math.max(14, lines.length * 4.5 + 8);
    ensurePageSpace(context, boxHeight + 4);

    doc.setFillColor(fillColor);
    doc.roundedRect(marginX, context.cursorY, pageWidth - marginX * 2, boxHeight, 4, 4, 'F');
    doc.setTextColor(ADMIN_REPORT_THEME.colors.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(normalizedTitle, marginX + 4, context.cursorY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(lines, marginX + 4, context.cursorY + 10);
    context.cursorY += boxHeight + 4;
}

export function addKeyValueTable(context: ReportContext, rows: Array<[string, string]>, title?: string) {
    if (rows.length === 0) return;
    if (title) addSectionTitle(context, title);

    autoTable(context.doc, {
        startY: context.cursorY,
        margin: { left: context.marginX, right: context.marginX, bottom: 20 },
        head: [['Campo', 'Valor']],
        body: rows.map(([left, right]) => [normalizePdfTableCell(left, '--'), normalizePdfTableCell(right, '--')]),
        theme: 'grid',
        headStyles: {
            fillColor: ADMIN_REPORT_THEME.colors.primary,
            textColor: '#ffffff',
            fontStyle: 'bold'
        },
        styles: {
            font: 'helvetica',
            fontSize: 9.5,
            cellPadding: 2.5,
            overflow: 'linebreak',
            textColor: ADMIN_REPORT_THEME.colors.ink
        },
        columnStyles: {
            0: { cellWidth: 52, fontStyle: 'bold' },
            1: { cellWidth: 'auto' }
        }
    });

    context.cursorY =
        ((context.doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? context.cursorY) + 5;
}

export function addDataTable(context: ReportContext, table: ReportSectionTable) {
    addSectionTitle(context, table.title);
    if (table.description) {
        addParagraph(context, table.description);
    }
    if (table.note) {
        addNoticeBox(context, 'Nota', table.note, 'info');
    }

    autoTable(context.doc, {
        startY: context.cursorY,
        margin: { left: context.marginX, right: context.marginX, bottom: 20 },
        head: [table.head.map((cell) => normalizePdfTableCell(cell, '--'))],
        body: table.body.map(normalizeRowInput),
        theme: 'grid',
        headStyles: {
            fillColor: ADMIN_REPORT_THEME.colors.primary,
            textColor: '#ffffff',
            fontStyle: 'bold'
        },
        styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 2.4,
            overflow: 'linebreak',
            textColor: ADMIN_REPORT_THEME.colors.ink
        },
        columnStyles: table.columnStyles
    });
    context.cursorY =
        ((context.doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? context.cursorY) + 5;
}

export function addFooterToAllPages(context: ReportContext) {
    const { doc, pageWidth, pageHeight, marginX, sectionTitle } = context;
    const pageCount = doc.getNumberOfPages();
    const footerNotice = normalizePdfText(ADMIN_REPORT_THEME.footerNotice, 'Documento administrativo interno.');

    for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(219, 231, 243);
        doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(82, 100, 118);
        doc.text(normalizePdfText(sectionTitle, 'Reporte CognIA'), marginX, pageHeight - 7);
        doc.text(footerNotice, pageWidth / 2, pageHeight - 7, { align: 'center' });
        doc.text(`Página ${page} de ${pageCount}`, pageWidth - marginX, pageHeight - 7, { align: 'right' });
    }
}

export function saveReport(context: ReportContext, filename: string) {
    addFooterToAllPages(context);
    context.doc.save(filename);
}
