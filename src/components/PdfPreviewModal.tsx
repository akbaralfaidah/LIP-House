import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileDown, Layers, Loader2, Printer, Share2, X } from 'lucide-react';
import type { ProjectId, SiteplanProject } from '../types/siteplan';
import {
  PDF_PREVIEW_BASE_HEIGHT,
  PDF_PREVIEW_BASE_WIDTH,
  PdfSheetPage,
} from './PdfSheetPage';

function canUseNativeFileShare(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  if (typeof navigator.canShare !== 'function') return false;
  try {
    const testFile = new File([''], 'test.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

export type PdfExportScope = 'all' | ProjectId;

interface PdfPreviewModalProps {
  isOpen: boolean;
  projects: SiteplanProject[];
  scope: PdfExportScope;
  activeProjectId: ProjectId;
  printedAtIso: string;
  onChangeScope: (scope: PdfExportScope) => void;
  onClose: () => void;
  onTriggerPrint: () => void;
}

export function PdfPreviewModal({
  isOpen,
  projects,
  scope,
  activeProjectId,
  printedAtIso,
  onChangeScope,
  onClose,
  onTriggerPrint,
}: PdfPreviewModalProps) {
  const stackRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(PDF_PREVIEW_BASE_WIDTH);
  const [busyMode, setBusyMode] = useState<'download' | 'share' | null>(null);
  const [statusHint, setStatusHint] = useState<string | null>(null);

  const supportsFileShare = useMemo(() => canUseNativeFileShare(), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const el = stackRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setContainerWidth(Math.min(PDF_PREVIEW_BASE_WIDTH, w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  if (!isOpen) return null;

  const targetProjects =
    scope === 'all' ? projects : projects.filter((p) => p.id === scope);
  const currentSingleId = scope === 'all' ? activeProjectId : scope;
  const currentSingleProject =
    projects.find((p) => p.id === currentSingleId) ?? projects[0];

  const previewScale = Math.min(1, containerWidth / PDF_PREVIEW_BASE_WIDTH);
  const scaledHeight = Math.round(PDF_PREVIEW_BASE_HEIGHT * previewScale);

  const collectRenderedSvgs = (): Record<string, SVGSVGElement | null> => {
    const map: Record<string, SVGSVGElement | null> = {};
    const root = stackRef.current;
    if (!root) return map;
    for (const project of targetProjects) {
      const host = root.querySelector(`[data-pdf-svg-host="${project.id}"]`);
      map[project.id] = host ? (host.querySelector('svg') as SVGSVGElement | null) : null;
    }
    return map;
  };

  const handleDownloadDirectPdf = async () => {
    setBusyMode('download');
    setStatusHint(null);
    try {
      const { generateVectorSiteplanPdfBlob, triggerPdfDownload } = await import(
        '../utils/exportVectorPdf'
      );
      const { blob, fileName } = await generateVectorSiteplanPdfBlob({
        projects: targetProjects,
        svgByProjectId: collectRenderedSvgs(),
        printedAtIso: new Date().toISOString(),
      });
      triggerPdfDownload(blob, fileName);
      setStatusHint(`Berhasil mengunduh ${fileName} (${targetProjects.length} halaman vektor)`);
    } catch {
      setStatusHint('Gagal membuat file PDF langsung. Coba tombol Cetak.');
    } finally {
      setBusyMode(null);
    }
  };

  const handleShareDirectPdf = async () => {
    setBusyMode('share');
    setStatusHint(null);
    try {
      const { generateVectorSiteplanPdfBlob, sharePdfFile } = await import(
        '../utils/exportVectorPdf'
      );
      const { blob, fileName } = await generateVectorSiteplanPdfBlob({
        projects: targetProjects,
        svgByProjectId: collectRenderedSvgs(),
        printedAtIso: new Date().toISOString(),
      });
      const result = await sharePdfFile(blob, fileName);
      if (result === 'fallback') {
        setStatusHint(`Berhasil mengunduh ${fileName}`);
      }
    } catch {
      setStatusHint('Gagal membagikan PDF. Gunakan tombol Download PDF.');
    } finally {
      setBusyMode(null);
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-[60] flex flex-col bg-slate-900/75 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau Export PDF Siteplan LIP House"
    >
      {/* Responsive Clean Top Toolbar */}
      <div className="border-b border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:px-6 sm:py-3">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          {/* Row 1: Title + Close button on mobile */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sky-300">
                <FileDown className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-extrabold text-slate-900 sm:text-sm">
                PDF Vektor ({targetProjects.length} Hal · A4 Landscape)
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 md:hidden cursor-pointer"
              aria-label="Tutup pratinjau PDF"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Row 2: Scope Switch + 1-Tap Direct Download / Share / Print */}
          <div className="flex flex-wrap items-center justify-between gap-2 md:justify-end">
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 ring-1 ring-slate-200 sm:p-1">
              <button
                type="button"
                onClick={() => onChangeScope('all')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition sm:px-3 sm:text-xs cursor-pointer ${
                  scope === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>4 Hal</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeScope(currentSingleProject.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition sm:px-3 sm:text-xs cursor-pointer ${
                  scope !== 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{currentSingleProject.shortName} (1)</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Primary 1-Tap Pure Vector PDF File Download (works on iPhone Safari, Android & Desktop!) */}
              <button
                type="button"
                disabled={busyMode !== null}
                onClick={handleDownloadDirectPdf}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-60 sm:px-4 sm:py-2 sm:text-sm cursor-pointer"
              >
                {busyMode === 'download' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
                ) : (
                  <Download className="h-4 w-4 text-sky-300" />
                )}
                <span>{busyMode === 'download' ? 'Menyiapkan...' : 'Download PDF'}</span>
              </button>

              {/* Native Share (WhatsApp / Save to Files on iPhone & Android) */}
              {supportsFileShare && (
                <button
                  type="button"
                  disabled={busyMode !== null}
                  onClick={handleShareDirectPdf}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 sm:px-3 sm:py-2 cursor-pointer"
                  title="Bagikan PDF ke WhatsApp / Simpan ke File"
                >
                  {busyMode === 'share' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" />
                  )}
                  <span>Bagikan</span>
                </button>
              )}

              {/* Desktop Direct Print Button */}
              <button
                type="button"
                onClick={onTriggerPrint}
                className="hidden items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 sm:inline-flex cursor-pointer"
                title="Cetak langsung ke printer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Cetak</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="hidden rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 md:inline-flex cursor-pointer"
                aria-label="Tutup pratinjau PDF"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {statusHint && (
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-1.5 text-center text-xs font-semibold text-emerald-800">
          {statusHint}
        </div>
      )}

      {/* Auto-Scaled A4 Landscape Sheet Stack (100% Proportional on Mobile & Desktop!) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
        <div ref={stackRef} className="mx-auto max-w-[980px] space-y-4 sm:space-y-6">
          {targetProjects.map((project, index) => (
            <div
              key={project.id}
              className="mx-auto overflow-hidden rounded-xl shadow-lg"
              style={{
                width: `${Math.round(PDF_PREVIEW_BASE_WIDTH * previewScale)}px`,
                height: `${scaledHeight}px`,
              }}
            >
              <div
                style={{
                  width: `${PDF_PREVIEW_BASE_WIDTH}px`,
                  height: `${PDF_PREVIEW_BASE_HEIGHT}px`,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                }}
              >
                <PdfSheetPage
                  project={project}
                  pageNumber={index + 1}
                  totalPages={targetProjects.length}
                  printedAtIso={printedAtIso}
                  variant="preview"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
