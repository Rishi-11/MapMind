import React, { useState } from 'react';
import { toPng, toSvg, toBlob } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  Download,
  Copy,
  FileCode,
  FileText,
  Check,
  Loader2,
  Image,
  ShieldCheck,
  Palette,
} from 'lucide-react';
import { CanvasSettings } from '@/types/graph';
import { CANVAS_BACKGROUND_PRESETS } from '@/lib/canvasThemes';

interface ExportMenuProps {
  onClose: () => void;
  settings?: CanvasSettings;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ onClose, settings, onNotify }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdfLayout, setPdfLayout] = useState<'single' | 'multi'>('single');
  const [hideUIElements, setHideUIElements] = useState(true);
  const [useCanvasBg, setUseCanvasBg] = useState(true);

  const getViewportElement = (): HTMLElement | null => {
    return document.querySelector('.react-flow__viewport') as HTMLElement | null;
  };

  const getExportBgColor = (): string => {
    if (!useCanvasBg || !settings) return '#ffffff';
    const bgPreset =
      CANVAS_BACKGROUND_PRESETS[settings.backgroundPreset || 'warm'] ||
      CANVAS_BACKGROUND_PRESETS.warm;
    const tone = settings.theme === 'dark' ? bgPreset.dark : bgPreset.light;
    return tone.hex;
  };

  /**
   * Filter out editor-only UI artifacts like handle connection dots, buttons, and minimaps
   */
  const exportFilter = (node: HTMLElement): boolean => {
    if (!hideUIElements) return true;
    if (!node.classList) return true;

    // Filter out all connection handle dots on the sides of nodes
    if (node.classList.contains('react-flow__handle')) {
      return false;
    }

    // Filter out minimap, controls, and helper panels
    if (
      node.classList.contains('react-flow__minimap') ||
      node.classList.contains('react-flow__controls') ||
      node.classList.contains('react-flow__panel')
    ) {
      return false;
    }

    // Filter out interactive editing buttons on nodes (+, -, lock buttons)
    if (node.tagName === 'BUTTON' && node.closest('.react-flow__node')) {
      return false;
    }

    return true;
  };

  /**
   * Copy high-res PNG image directly to clipboard
   */
  const handleCopyPngToClipboard = async () => {
    const viewport = getViewportElement();
    if (!viewport) {
      onNotify?.('Canvas viewport not found', 'error');
      return;
    }

    setIsExporting(true);
    try {
      const blob = await toBlob(viewport, {
        backgroundColor: getExportBgColor(),
        pixelRatio: 2,
        filter: exportFilter,
      });

      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        onNotify?.('Clean PNG copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 2500);
      } else {
        onNotify?.('Clipboard API not supported in this browser.', 'error');
      }
    } catch (err) {
      console.error('Failed to copy image to clipboard:', err);
      onNotify?.('Failed to copy image to clipboard.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Download high-res PNG image
   */
  const handleDownloadPng = async () => {
    const viewport = getViewportElement();
    if (!viewport) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(viewport, {
        backgroundColor: getExportBgColor(),
        pixelRatio: 2,
        filter: exportFilter,
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `mapmind_diagram_${Date.now()}.png`;
      a.click();
      onNotify?.('Downloaded clean PNG successfully!', 'success');
      onClose();
    } catch (err) {
      console.error('Failed to download PNG:', err);
      onNotify?.('Failed to download PNG.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Export to Single-Page or Multi-Page PDF using jsPDF
   */
  const handleDownloadPdf = async () => {
    const viewport = getViewportElement();
    if (!viewport) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(viewport, {
        backgroundColor: getExportBgColor(),
        pixelRatio: 2,
        filter: exportFilter,
      });

      const img = new window.Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;

      if (pdfLayout === 'single') {
        const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait';
        const pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: [imgWidth / 2, imgHeight / 2],
        });

        pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth / 2, imgHeight / 2);
        pdf.save(`mapmind_diagram_${Date.now()}.pdf`);
      } else {
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const margin = 10;
        const availableWidth = pageWidth - margin * 2;
        const availableHeight = pageHeight - margin * 2;

        const ratio = Math.min(
          availableWidth / (imgWidth / 2),
          availableHeight / (imgHeight / 2)
        );

        const targetW = (imgWidth / 2) * ratio;
        const targetH = (imgHeight / 2) * ratio;

        const offsetX = (pageWidth - targetW) / 2;
        const offsetY = (pageHeight - targetH) / 2;

        pdf.addImage(dataUrl, 'PNG', offsetX, offsetY, targetW, targetH);
        pdf.addPage('a4', 'landscape');
        pdf.text('MapMind Diagram - Section 1', margin, 15);
        pdf.addImage(dataUrl, 'PNG', margin, 20, availableWidth, (availableWidth * imgHeight) / imgWidth);

        pdf.save(`mapmind_multi_page_${Date.now()}.pdf`);
      }

      onNotify?.('PDF exported successfully without handle dots!', 'success');
      onClose();
    } catch (err) {
      console.error('Failed to export PDF:', err);
      onNotify?.('Failed to generate PDF.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Download SVG vector
   */
  const handleDownloadSvg = async () => {
    const viewport = getViewportElement();
    if (!viewport) return;

    setIsExporting(true);
    try {
      const dataUrl = await toSvg(viewport, {
        backgroundColor: getExportBgColor(),
        filter: exportFilter,
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `mapmind_diagram_${Date.now()}.svg`;
      a.click();
      onNotify?.('Downloaded clean SVG vector!', 'success');
      onClose();
    } catch (err) {
      console.error('Failed to download SVG:', err);
      onNotify?.('Failed to download SVG.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/80">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Export Diagram
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Render and download presentation-ready canvas
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold p-1"
          >
            &times;
          </button>
        </div>

        {/* Options Row */}
        <div className="mt-4 space-y-2">
          {/* Clean Presentation Option */}
          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Clean Presentation Mode
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hides all side connection dots & editor buttons
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={hideUIElements}
              onChange={(e) => setHideUIElements(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Preserve Canvas Background Tone */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Preserve Canvas Atmosphere
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Use current paper tone ({settings?.backgroundPreset || 'warm'})
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={useCanvasBg}
              onChange={(e) => setUseCanvasBg(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="py-4 space-y-3">
          {/* Copy to Clipboard */}
          <button
            onClick={handleCopyPngToClipboard}
            disabled={isExporting}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {copied ? 'Copied to Clipboard!' : 'Copy PNG to Clipboard'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Paste directly into Slack, Notion, or Docs (no dots)
                </div>
              </div>
            </div>
            {isExporting && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </button>

          {/* Download PNG */}
          <button
            onClick={handleDownloadPng}
            disabled={isExporting}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                <Image className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Download High-Res PNG
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Clean 2x density image without connection handles
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
          </button>

          {/* Download PDF with Layout option */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Download PDF Document
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Printable vector PDF without editor artifacts
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 mb-3">
              <button
                type="button"
                onClick={() => setPdfLayout('single')}
                className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-medium border transition-colors ${
                  pdfLayout === 'single'
                    ? 'bg-white dark:bg-slate-700 border-blue-500 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-750'
                }`}
              >
                Single Page (Fitted)
              </button>
              <button
                type="button"
                onClick={() => setPdfLayout('multi')}
                className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-medium border transition-colors ${
                  pdfLayout === 'multi'
                    ? 'bg-white dark:bg-slate-700 border-blue-500 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-750'
                }`}
              >
                Multi-Page (A4 Landscape)
              </button>
            </div>

            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Generate & Download PDF
            </button>
          </div>

          {/* Download SVG */}
          <button
            onClick={handleDownloadSvg}
            disabled={isExporting}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Download SVG Vector
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Clean vector XML without handle dots
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
