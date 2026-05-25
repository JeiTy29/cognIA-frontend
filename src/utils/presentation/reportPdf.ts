import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function waitForImage(image: HTMLImageElement) {
    if (image.complete) return Promise.resolve();

    return new Promise<void>((resolve) => {
        const cleanup = () => {
            image.removeEventListener('load', handleDone);
            image.removeEventListener('error', handleDone);
        };
        const handleDone = () => {
            cleanup();
            resolve();
        };

        image.addEventListener('load', handleDone, { once: true });
        image.addEventListener('error', handleDone, { once: true });
    });
}

async function waitForFrameResources(frame: HTMLIFrameElement) {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) return;

    if (typeof doc.fonts?.ready?.then === 'function') {
        await doc.fonts.ready.catch(() => undefined);
    }

    const images = Array.from(doc.images);
    await Promise.all(images.map((image) => waitForImage(image)));

    await new Promise<void>((resolve) => win.requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => win.requestAnimationFrame(() => resolve()));
}

function getPdfPageTargets(doc: Document) {
    const pages = Array.from(doc.querySelectorAll<HTMLElement>('.report-pdf-page'));
    if (pages.length > 0) return pages;

    const body = doc.body as HTMLElement | null;
    return body ? [body] : [];
}

export async function renderReportHtmlToPdfBlob(
    html: string,
    options: {
        backgroundColor?: string;
        scale?: number;
    } = {}
) {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '1200px';
    iframe.style.height = '1600px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = '0';

    const loadPromise = new Promise<void>((resolve, reject) => {
        iframe.onload = () => resolve();
        iframe.onerror = () => reject(new Error('report_iframe_failed'));
    });

    document.body.appendChild(iframe);
    iframe.srcdoc = html;

    try {
        await loadPromise;
        await waitForFrameResources(iframe);

        const doc = iframe.contentDocument;
        if (!doc) {
            throw new Error('report_document_unavailable');
        }

        const targets = getPdfPageTargets(doc);
        if (targets.length === 0) {
            throw new Error('report_pages_unavailable');
        }

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        for (const [index, pageElement] of targets.entries()) {
            const canvas = await html2canvas(pageElement, {
                scale: options.scale ?? 2,
                useCORS: true,
                backgroundColor: options.backgroundColor ?? '#f8fbff',
                logging: false,
                windowWidth: 1200
            });

            const imageData = canvas.toDataURL('image/png');
            const widthRatio = pageWidth / canvas.width;
            const heightRatio = pageHeight / canvas.height;
            const scale = Math.min(widthRatio, heightRatio);
            const renderWidth = canvas.width * scale;
            const renderHeight = canvas.height * scale;
            const offsetX = (pageWidth - renderWidth) / 2;
            const offsetY = 0;

            if (index > 0) {
                pdf.addPage();
            }

            pdf.addImage(imageData, 'PNG', offsetX, offsetY, renderWidth, renderHeight, undefined, 'FAST');
        }

        return pdf.output('blob');
    } finally {
        iframe.remove();
    }
}

export function downloadPdfBlob(blob: Blob, filename: string) {
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(href);
}
