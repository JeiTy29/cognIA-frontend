import type jsPDF from 'jspdf';
import { ADMIN_REPORT_THEME } from './adminReportTheme';
import {
    addNoticeBox,
    addParagraph,
    addSectionTitle,
    ensureReportPageSpace,
    type ReportContext
} from './pdfBase';
import { formatReportNumber, formatReportPercent } from './reportFormatting';

export type ReportChartPoint = {
    label: string;
    value: number;
};

export type ReportChartConfig = {
    title: string;
    description: string;
    points: ReportChartPoint[];
    valueLabel?: string;
    unit?: string;
    percent?: boolean;
};

const CHART_COLORS = ['#0b6fb8', '#1f9d55', '#f0ad4e', '#dc3545', '#6a6f7d', '#7c3aed', '#0ea5e9', '#14b8a6'];

function hexToRgb(hex: string) {
    const normalized = hex.replace('#', '');
    const safe = normalized.length === 3
        ? normalized.split('').map((char) => `${char}${char}`).join('')
        : normalized;
    const value = Number.parseInt(safe, 16);
    return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255
    };
}

function setDrawHex(doc: jsPDF, hex: string) {
    const { r, g, b } = hexToRgb(hex);
    doc.setDrawColor(r, g, b);
}

function setFillHex(doc: jsPDF, hex: string) {
    const { r, g, b } = hexToRgb(hex);
    doc.setFillColor(r, g, b);
}

function setTextHex(doc: jsPDF, hex: string) {
    const { r, g, b } = hexToRgb(hex);
    doc.setTextColor(r, g, b);
}

function truncateLabel(label: string, maxLength = 18) {
    const normalized = label.trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength - 1)}…`;
}

function normalizeChartValue(value: number, percent = false) {
    if (!percent) return value;
    return value <= 1 ? value * 100 : value;
}

function formatChartValue(value: number, config: ReportChartConfig) {
    if (config.percent) return formatReportPercent(value, '0 %');
    const base = formatReportNumber(value, '0');
    return config.unit ? `${base} ${config.unit}` : base;
}

function normalizePoints(points: ReportChartPoint[], percent = false) {
    return points
        .filter((point) => point.label.trim().length > 0 && Number.isFinite(point.value))
        .map((point) => ({
            label: point.label.trim(),
            rawValue: point.value,
            value: normalizeChartValue(point.value, percent)
        }));
}

function drawChartContainer(context: ReportContext, chartHeight: number) {
    const { doc, marginX, pageWidth } = context;
    const width = pageWidth - marginX * 2;
    ensureReportPageSpace(context, chartHeight + 8);
    setFillHex(doc, ADMIN_REPORT_THEME.colors.surfaceMuted);
    setDrawHex(doc, ADMIN_REPORT_THEME.colors.line);
    doc.roundedRect(marginX, context.cursorY, width, chartHeight, 4, 4, 'FD');
    return {
        x: marginX,
        y: context.cursorY,
        width,
        height: chartHeight
    };
}

function renderNoDataState(context: ReportContext, config: ReportChartConfig, message: string) {
    addSectionTitle(context, config.title);
    addParagraph(context, config.description);
    addNoticeBox(context, 'Sin gráfica disponible', message, 'info');
}

function renderAllZeroState(context: ReportContext, config: ReportChartConfig) {
    renderNoDataState(context, config, 'No se registran valores para este periodo.');
}

function finalizeChart(context: ReportContext, chartHeight: number) {
    context.cursorY += chartHeight + 6;
}

export function drawBarChart(context: ReportContext, config: ReportChartConfig) {
    const points = normalizePoints(config.points, config.percent);
    if (points.length === 0) {
        renderNoDataState(context, config, 'No hay datos suficientes para generar esta gráfica.');
        return;
    }
    if (points.every((point) => point.value === 0)) {
        renderAllZeroState(context, config);
        return;
    }

    addSectionTitle(context, config.title);
    addParagraph(context, config.description);

    const chartHeight = 78;
    const chart = drawChartContainer(context, chartHeight);
    const { doc } = context;
    const left = chart.x + 12;
    const right = chart.x + chart.width - 8;
    const top = chart.y + 8;
    const bottom = chart.y + chart.height - 16;
    const plotHeight = bottom - top;
    const plotWidth = right - left;
    const maxValue = Math.max(...points.map((point) => point.value), 1);
    const barGap = 4;
    const barWidth = Math.max(8, (plotWidth - barGap * (points.length - 1)) / points.length);

    setDrawHex(doc, ADMIN_REPORT_THEME.colors.line);
    doc.line(left, bottom, right, bottom);
    doc.line(left, top, left, bottom);

    points.forEach((point, index) => {
        const barHeight = (point.value / maxValue) * (plotHeight - 6);
        const x = left + index * (barWidth + barGap);
        const y = bottom - barHeight;
        setFillHex(doc, CHART_COLORS[index % CHART_COLORS.length]);
        doc.rect(x, y, barWidth, barHeight, 'F');

        setTextHex(doc, ADMIN_REPORT_THEME.colors.ink);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(formatChartValue(point.rawValue, config), x + barWidth / 2, Math.max(top + 4, y - 2), { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(truncateLabel(point.label, 14), x + barWidth / 2, bottom + 5, { align: 'center' });
    });

    finalizeChart(context, chartHeight);
}

export function drawHorizontalBarChart(context: ReportContext, config: ReportChartConfig) {
    const points = normalizePoints(config.points, config.percent)
        .filter((point) => point.label.trim().length > 0)
        .sort((left, right) => right.value - left.value);

    if (points.length === 0) {
        renderNoDataState(context, config, 'No hay datos suficientes para generar esta gráfica.');
        return;
    }
    if (points.every((point) => point.value === 0)) {
        renderAllZeroState(context, config);
        return;
    }

    addSectionTitle(context, config.title);
    addParagraph(context, config.description);

    const visiblePoints = points.slice(0, 8);
    const chartHeight = Math.max(48, 18 + visiblePoints.length * 10);
    const chart = drawChartContainer(context, chartHeight);
    const { doc } = context;
    const labelWidth = 44;
    const valueWidth = 18;
    const barStartX = chart.x + labelWidth;
    const barWidth = chart.width - labelWidth - valueWidth - 8;
    const rowHeight = 8.5;
    const top = chart.y + 10;
    const maxValue = Math.max(...visiblePoints.map((point) => point.value), 1);

    visiblePoints.forEach((point, index) => {
        const y = top + index * rowHeight;
        const width = Math.max(2, (point.value / maxValue) * barWidth);

        setTextHex(doc, ADMIN_REPORT_THEME.colors.ink);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(truncateLabel(point.label, 24), chart.x + 4, y + 4);

        setFillHex(doc, CHART_COLORS[index % CHART_COLORS.length]);
        doc.roundedRect(barStartX, y + 1, width, 4.5, 1.5, 1.5, 'F');

        setTextHex(doc, ADMIN_REPORT_THEME.colors.muted);
        doc.text(formatChartValue(point.rawValue, config), barStartX + barWidth + 4, y + 4);
    });

    finalizeChart(context, chartHeight);
}

export function drawLineChart(context: ReportContext, config: ReportChartConfig) {
    const points = normalizePoints(config.points, config.percent);
    if (points.length < 2) {
        renderNoDataState(context, config, 'No hay suficientes datos históricos para generar esta gráfica.');
        return;
    }
    if (points.every((point) => point.value === 0)) {
        renderAllZeroState(context, config);
        return;
    }

    addSectionTitle(context, config.title);
    addParagraph(context, config.description);

    const chartHeight = 72;
    const chart = drawChartContainer(context, chartHeight);
    const { doc } = context;
    const left = chart.x + 18;
    const right = chart.x + chart.width - 8;
    const top = chart.y + 8;
    const bottom = chart.y + chart.height - 14;
    const plotWidth = right - left;
    const plotHeight = bottom - top;
    const maxValue = Math.max(...points.map((point) => point.value), 1);
    const minValue = Math.min(...points.map((point) => point.value), 0);
    const valueRange = maxValue - minValue || 1;
    const stepX = points.length > 1 ? plotWidth / (points.length - 1) : plotWidth;

    setDrawHex(doc, ADMIN_REPORT_THEME.colors.line);
    doc.line(left, bottom, right, bottom);
    doc.line(left, top, left, bottom);

    const yTicks = [0, 0.5, 1].map((ratio) => minValue + valueRange * ratio);
    yTicks.forEach((tickValue) => {
        const y = bottom - ((tickValue - minValue) / valueRange) * plotHeight;
        setDrawHex(doc, ADMIN_REPORT_THEME.colors.line);
        doc.line(left, y, right, y);
        setTextHex(doc, ADMIN_REPORT_THEME.colors.muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(formatChartValue(config.percent ? tickValue / 100 : tickValue, config), left - 2, y + 1, {
            align: 'right'
        });
    });

    setDrawHex(doc, ADMIN_REPORT_THEME.colors.primary);
    doc.setLineWidth(0.8);

    points.forEach((point, index) => {
        const x = left + index * stepX;
        const y = bottom - ((point.value - minValue) / valueRange) * plotHeight;
        if (index > 0) {
            const previous = points[index - 1];
            const previousX = left + (index - 1) * stepX;
            const previousY = bottom - ((previous.value - minValue) / valueRange) * plotHeight;
            doc.line(previousX, previousY, x, y);
        }
        setFillHex(doc, ADMIN_REPORT_THEME.colors.primary);
        doc.circle(x, y, 1.2, 'F');
        if (points.length <= 6) {
            setTextHex(doc, ADMIN_REPORT_THEME.colors.ink);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text(formatChartValue(point.rawValue, config), x, y - 2.2, { align: 'center' });
        }
    });

    const labelStep = points.length > 6 ? Math.ceil(points.length / 6) : 1;
    points.forEach((point, index) => {
        if (index % labelStep !== 0 && index !== points.length - 1) return;
        const x = left + index * stepX;
        setTextHex(doc, ADMIN_REPORT_THEME.colors.ink);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(truncateLabel(point.label, 16), x, bottom + 5, { align: 'center' });
    });

    finalizeChart(context, chartHeight);
}
