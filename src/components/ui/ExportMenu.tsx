import React, { useState, useMemo } from 'react';
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
  Maximize,
  Sliders,
} from 'lucide-react';
import { CanvasSettings, MapMindNode, MapMindEdge } from '@/types/graph';
import { CANVAS_BACKGROUND_PRESETS } from '@/lib/canvasThemes';
import { generatePureVectorSvgString } from '@/lib/export/svgVectorExporter';

interface ExportMenuProps {
  onClose: () => void;
  nodes?: MapMindNode[];
  edges?: MapMindEdge[];
  settings?: CanvasSettings;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface DiagramBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  exportWidth: number;
  exportHeight: number;
  transform: string;
  visibleCount: number;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
  onClose,
  nodes = [],
  edges = [],
  settings,
  onNotify,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdfLayout, setPdfLayout] = useState<'single' | 'multi'>('single');
  const [hideUIElements, setHideUIElements] = useState(true);
  const [useCanvasBg, setUseCanvasBg] = useState(true);
  const [resolutionScale, setResolutionScale] = useState<number>(2); // 1x, 2x, 3x
  const [padding, setPadding] = useState<number>(80); // 40, 80, 140
  const [svgMode, setSvgMode] = useState<'vector' | 'ui'>('vector');

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
   * Calculates the exact bounding box enclosing all visible nodes regardless of screen size.
   */
  const bounds = useMemo<DiagramBounds | null>(() => {
    const visibleNodes = nodes.filter((n) => !n.data?.hidden);
    if (visibleNodes.length === 0) {
      const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
      if (!viewport) return null;
      const rect = viewport.getBoundingClientRect();
      return {
        minX: 0,
        minY: 0,
        maxX: rect.width,
        maxY: rect.height,
        width: rect.width,
        height: rect.height,
        exportWidth: Math.ceil(rect.width + padding * 2),
        exportHeight: Math.ceil(rect.height + padding * 2),
        transform: `translate(${padding}px, ${padding}px) scale(1)`,
        visibleCount: 0,
      };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    visibleNodes.forEach((node) => {
      const x = node.position.x;
      const y = node.position.y;
      const w = node.measured?.width || (node.width as number) || 240;
      const h = node.measured?.height || (node.height as number) || 95;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    const rawWidth = Math.max(150, maxX - minX);
    const rawHeight = Math.max(100, maxY - minY);
    const exportWidth = Math.ceil(rawWidth + padding * 2);
    const exportHeight = Math.ceil(rawHeight + padding * 2);
    const transform = `translate(${-minX + padding}px, ${-minY + padding}px) scale(1)`;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: rawWidth,
      height: rawHeight,
      exportWidth,
      exportHeight,
      transform,
      visibleCount: visibleNodes.length,
    };
  }, [nodes, padding]);

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

    if (node.getAttribute && node.getAttribute('data-export-ignore') === 'true') {
      return false;
    }

    return true;
  };

  const getExportOptions = () => {
    if (!bounds) return null;
    return {
      backgroundColor: getExportBgColor(),
      width: bounds.exportWidth,
      height: bounds.exportHeight,
      style: {
        width: `${bounds.exportWidth}px`,
        height: `${bounds.exportHeight}px`,
        transform: bounds.transform,
        transformOrigin: 'top left',
      },
      pixelRatio: resolutionScale,
      filter: exportFilter,
    };
  };

  /**
   * Copy high-res PNG image directly to clipboard
   */
  const handleCopyPngToClipboard = async () => {
    const viewport = getViewportElement();
    if (!viewport || !bounds) {
      onNotify?.('Canvas viewport not found', 'error');
      return;
    }

    const options = getExportOptions();
    if (!options) return;

    setIsExporting(true);
    try {
      const blob = await toBlob(viewport, options);

      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        onNotify?.('Full diagram copied to clipboard!', 'success');
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
   * Download high-res PNG image covering the entire diagram
   */
  const handleDownloadPng = async () => {
    const viewport = getViewportElement();
    if (!viewport || !bounds) return;

    const options = getExportOptions();
    if (!options) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(viewport, options);

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `mapmind_diagram_${bounds.exportWidth}x${bounds.exportHeight}_${Date.now()}.png`;
      a.click();
      onNotify?.(`Downloaded complete PNG (${bounds.exportWidth}×${bounds.exportHeight}px)!`, 'success');
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
    if (!viewport || !bounds) return;

    const options = getExportOptions();
    if (!options) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(viewport, options);

      const img = new window.Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;

      if (pdfLayout === 'single') {
        const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait';
        const pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: [imgWidth / resolutionScale, imgHeight / resolutionScale],
          hotfixes: ['px_scaling'],
        });

        pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth / resolutionScale, imgHeight / resolutionScale);
        pdf.save(`mapmind_diagram_${Date.now()}.pdf`);
      } else {
        // Multi-page slicing for long vertical or wide diagrams
        const isTall = imgHeight > imgWidth;
        const pdfOrientation = isTall ? 'p' : 'l';
        const pdf = new jsPDF(pdfOrientation, 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const margin = 12;
        const headerSpace = 8;
        const availableWidth = pageWidth - margin * 2;
        const availableHeight = pageHeight - margin * 2 - headerSpace;

        const scale = availableWidth / imgWidth;
        const totalScaledHeight = imgHeight * scale;
        const pageCount = Math.max(1, Math.ceil(totalScaledHeight / availableHeight));

        for (let page = 0; page < pageCount; page++) {
          if (page > 0) {
            pdf.addPage('a4', pdfOrientation);
          }

          // Header with page numbering and app branding
          pdf.setFontSize(8);
          pdf.setTextColor(140, 140, 140);
          pdf.text(
            `MapMind Diagram — Page ${page + 1} of ${pageCount}`,
            margin,
            margin + 2
          );

          // Calculate slice coordinate
          const sliceSourceY = (page * availableHeight) / scale;
          const sliceSourceHeight = Math.min(imgHeight - sliceSourceY, availableHeight / scale);
          const sliceDestHeight = sliceSourceHeight * scale;

          if (sliceSourceHeight > 0) {
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = imgWidth;
            sliceCanvas.height = sliceSourceHeight;
            const ctx = sliceCanvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = getExportBgColor();
              ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
              ctx.drawImage(
                img,
                0,
                sliceSourceY,
                imgWidth,
                sliceSourceHeight,
                0,
                0,
                imgWidth,
                sliceSourceHeight
              );
              const sliceDataUrl = sliceCanvas.toDataURL('image/png');
              pdf.addImage(
                sliceDataUrl,
                'PNG',
                margin,
                margin + headerSpace,
                availableWidth,
                sliceDestHeight
              );
            }
          }
        }

        pdf.save(`mapmind_multi_page_${Date.now()}.pdf`);
      }

      onNotify?.('PDF document exported successfully!', 'success');
      onClose();
    } catch (err) {
      console.error('Failed to export PDF:', err);
      onNotify?.('Failed to generate PDF.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Download SVG vector covering the full diagram
   */
  const handleDownloadSvg = async () => {
    if (!bounds) return;

    setIsExporting(true);
    try {
      let svgContent: string = '';

      if (svgMode === 'vector') {
        // High-performance pure vector SVG generator (immune to large graph DOM culling, size limits, or font CORS)
        svgContent = generatePureVectorSvgString(
          nodes,
          edges,
          settings,
          bounds,
          getExportBgColor(),
          padding
        );
      } else {
        const viewport = getViewportElement();
        const options = getExportOptions();
        if (viewport && options) {
          try {
            const dataUrl = await toSvg(viewport, {
              backgroundColor: options.backgroundColor,
              width: options.width,
              height: options.height,
              style: options.style,
              filter: options.filter,
              skipFonts: true,
              cacheBust: true,
            });

            if (dataUrl.startsWith('data:image/svg+xml;charset=utf-8,')) {
              svgContent = decodeURIComponent(dataUrl.substring('data:image/svg+xml;charset=utf-8,'.length));
            } else if (dataUrl.startsWith('data:image/svg+xml;base64,')) {
              svgContent = atob(dataUrl.substring('data:image/svg+xml;base64,'.length));
            } else if (dataUrl.startsWith('data:image/svg+xml,')) {
              svgContent = decodeURIComponent(dataUrl.substring('data:image/svg+xml,'.length));
            } else {
              svgContent = dataUrl;
            }
          } catch (domSvgErr) {
            console.warn('DOM toSvg failed, falling back to pure vector SVG:', domSvgErr);
            svgContent = generatePureVectorSvgString(
              nodes,
              edges,
              settings,
              bounds,
              getExportBgColor(),
              padding
            );
          }
        } else {
          svgContent = generatePureVectorSvgString(
            nodes,
            edges,
            settings,
            bounds,
            getExportBgColor(),
            padding
          );
        }
      }

      if (!svgContent.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgContent = svgContent.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      }

      // Use Blob and ObjectURL for streaming download without string URI limits
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `mapmind_diagram_${bounds.exportWidth}x${bounds.exportHeight}_${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      onNotify?.(`Downloaded complete SVG vector (${bounds.exportWidth}×${bounds.exportHeight}px)!`, 'success');
      onClose();
    } catch (err) {
      console.error('Failed to download SVG:', err);
      onNotify?.('Failed to generate SVG.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/80">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Export Full Diagram
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Render and download entire diagram without viewport clipping
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Full Diagram Dimensions Banner */}
        {bounds && (
          <div className="mt-4 p-3 rounded-xl bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
                <Maximize className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-blue-900 dark:text-blue-100">
                  Full Diagram Area Captured
                </div>
                <div className="text-[11px] text-blue-700 dark:text-blue-300 font-mono">
                  {bounds.exportWidth} × {bounds.exportHeight} px • {bounds.visibleCount} visible nodes
                </div>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-200/80 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              Complete
            </span>
          </div>
        )}

        {/* Resolution Scale & Padding Options */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Sliders className="w-3.5 h-3.5 text-blue-500" />
              <span>Resolution Quality:</span>
            </div>
            <div className="flex items-center gap-1">
              {[
                { scale: 1, label: '1x (Standard)' },
                { scale: 2, label: '2x (High-Res)' },
                { scale: 3, label: '3x (Ultra HD)' },
              ].map((res) => (
                <button
                  key={res.scale}
                  type="button"
                  onClick={() => setResolutionScale(res.scale)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    resolutionScale === res.scale
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Outer Margin Padding:
            </div>
            <div className="flex items-center gap-1">
              {[
                { val: 40, label: '40px' },
                { val: 80, label: '80px' },
                { val: 140, label: '140px' },
              ].map((pad) => (
                <button
                  key={pad.val}
                  type="button"
                  onClick={() => setPadding(pad.val)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    padding === pad.val
                      ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-bold'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {pad.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clean Presentation & Paper Tone Checkboxes */}
        <div className="mt-3 space-y-2">
          {/* Clean Presentation Option */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Clean Presentation Mode
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hides connection handle dots & interactive buttons
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
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
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

        {/* Action Export Buttons */}
        <div className="py-4 space-y-3">
          {/* Copy to Clipboard */}
          <button
            onClick={handleCopyPngToClipboard}
            disabled={isExporting}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors group text-left cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {copied ? 'Copied to Clipboard!' : 'Copy PNG to Clipboard'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Paste entire diagram directly into Slack, Notion, or Docs
                </div>
              </div>
            </div>
            {isExporting && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </button>

          {/* Download PNG */}
          <button
            onClick={handleDownloadPng}
            disabled={isExporting}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors group text-left cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                <Image className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Download High-Res PNG ({resolutionScale}x)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Complete bounding box without screen cutoffs
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
          </button>

          {/* Download PDF with Layout option */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Download PDF Document
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Vector-scaled PDF for print or documentation
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 mb-3">
              <button
                type="button"
                onClick={() => setPdfLayout('single')}
                className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-semibold border transition-colors cursor-pointer ${
                  pdfLayout === 'single'
                    ? 'bg-white dark:bg-slate-700 border-rose-500 text-rose-600 dark:text-rose-300 shadow-xs'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-750'
                }`}
              >
                Single Page (Exact Proportions)
              </button>
              <button
                type="button"
                onClick={() => setPdfLayout('multi')}
                className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-semibold border transition-colors cursor-pointer ${
                  pdfLayout === 'multi'
                    ? 'bg-white dark:bg-slate-700 border-rose-500 text-rose-600 dark:text-rose-300 shadow-xs'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-750'
                }`}
              >
                Multi-Page (A4 Slices for Tall Maps)
              </button>
            </div>

            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Generate & Download PDF
            </button>
          </div>

          {/* Download SVG */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Download SVG Vector Graphic
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Infinite-resolution vector graphic for design tools & web
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 mb-3">
              <button
                type="button"
                onClick={() => setSvgMode('vector')}
                className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-semibold border transition-colors cursor-pointer ${
                  svgMode === 'vector'
                    ? 'bg-white dark:bg-slate-700 border-purple-500 text-purple-600 dark:text-purple-300 shadow-xs'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-750'
                }`}
              >
                Pure Vector (Figma / Illustrator)
              </button>
              <button
                type="button"
                onClick={() => setSvgMode('ui')}
                className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-semibold border transition-colors cursor-pointer ${
                  svgMode === 'ui'
                    ? 'bg-white dark:bg-slate-700 border-purple-500 text-purple-600 dark:text-purple-300 shadow-xs'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-750'
                }`}
              >
                DOM UI Clone (Browser SVG)
              </button>
            </div>

            <button
              onClick={handleDownloadSvg}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Generate & Download SVG ({svgMode === 'vector' ? 'Vector' : 'UI Clone'})
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
