import { useEffect } from 'react';
import { FileDown, Layers, Printer, X } from 'lucide-react';
import type { ProjectId, SiteplanProject } from '../types/siteplan';
import { PdfSheetPage } from './PdfSheetPage';

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
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const targetProjects =
    scope === 'all' ? projects : projects.filter((p) => p.id === scope);
  const currentSingleId = scope === 'all' ? activeProjectId : scope;
  const currentSingleProject =
    projects.find((p) => p.id === currentSingleId) ?? projects[0];

  return (
    <div
      className="no-print fixed inset-0 z-[60] flex flex-col bg-slate-900/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau Export PDF Siteplan LIP House"
    >
      <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sky-300">
              <FileDown className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Pratinjau PDF ({targetProjects.length} Halaman · A4 Landscape)
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200">
              <button
                type="button"
                onClick={() => onChangeScope('all')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                  scope === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>4 Siteplan (4 Hal)</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeScope(currentSingleProject.id)}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                  scope !== 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{currentSingleProject.shortName} (1 Hal)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onTriggerPrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 sm:text-sm cursor-pointer"
            >
              <Printer className="h-4 w-4 text-sky-300" />
              <span>Simpan PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              aria-label="Tutup pratinjau PDF"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-sky-200/70 bg-sky-50 px-4 py-1.5 text-center text-[11px] font-medium text-sky-900">
        Pilih <strong>Save as PDF</strong> · <strong>Landscape</strong> · centang{' '}
        <strong>Background graphics</strong>.
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8">
        <div className="mx-auto max-w-[1040px] space-y-5">
          {targetProjects.map((project, index) => (
            <PdfSheetPage
              key={project.id}
              project={project}
              pageNumber={index + 1}
              totalPages={targetProjects.length}
              printedAtIso={printedAtIso}
              variant="preview"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
