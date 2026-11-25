import { STATUS_CONFIG, STATUS_ORDER } from '../constants/statuses';
import type { SiteplanProject } from '../types/siteplan';
import { formatDateTimeID, formatPercent } from '../utils/formatters';
import { computeUnitsStats } from '../utils/stats';
import { SiteplanSvg } from './SiteplanSvg';

interface PdfSheetPageProps {
  project: SiteplanProject;
  pageNumber: number;
  totalPages: number;
  printedAtIso: string;
  variant: 'preview' | 'print';
}

export const PDF_PREVIEW_BASE_WIDTH = 980;
export const PDF_PREVIEW_BASE_HEIGHT = 693; // Exact A4 Landscape 297:210 ratio

export function PdfSheetPage({
  project,
  pageNumber,
  totalPages,
  printedAtIso,
  variant,
}: PdfSheetPageProps) {
  const stats = computeUnitsStats(project.units);
  const isPrint = variant === 'print';

  return (
    <article
      style={
        isPrint
          ? undefined
          : {
              width: `${PDF_PREVIEW_BASE_WIDTH}px`,
              height: `${PDF_PREVIEW_BASE_HEIGHT}px`,
            }
      }
      className={
        isPrint
          ? 'print-sheet bg-white text-slate-900'
          : 'flex flex-col justify-between overflow-hidden rounded-xl border border-slate-300 bg-white p-6 text-slate-900 shadow-lg'
      }
    >
      {/* PDF Page Header */}
      <header className="flex items-center justify-between gap-4 border-b-2 border-slate-900 pb-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900">
            <svg viewBox="0 0 28 28" className="h-5 w-5" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="9" height="9" rx="1.5" fill="#4E8C5F" />
              <rect x="16" y="3" width="9" height="9" rx="1.5" fill="#CC733C" />
              <rect x="3" y="16" width="9" height="9" rx="1.5" fill="#30548E" />
              <rect x="16" y="16" width="9" height="9" rx="1.5" fill="#E2E8F0" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-slate-900">
                LIP HOUSE
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-base font-extrabold text-slate-900">
                {project.name}
              </span>
            </div>
            <p className="text-[10.5px] font-medium text-slate-600">
              {project.areaLabel} · {project.blocksSummary} · Total{' '}
              <span className="font-mono font-bold text-slate-900">{stats.total}</span> Kavling
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="inline-flex items-center rounded-md bg-slate-900 px-2.5 py-0.5 font-mono text-[10.5px] font-bold text-white">
            Halaman {pageNumber} dari {totalPages}
          </div>
          <p className="mt-1 font-mono text-[10px] font-medium text-slate-600">
            Dicetak Live: {formatDateTimeID(printedAtIso)}
          </p>
        </div>
      </header>

      {/* Center Stage: Pure Vector Full-Color SVG Siteplan */}
      <div
        data-pdf-svg-host={variant === 'preview' ? project.id : undefined}
        className="my-2 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5"
      >
        <SiteplanSvg
          project={project}
          mode="print"
          className="h-full w-full object-contain"
        />
      </div>

      {/* Bottom Strip: 7-Color Legend + Recap Table */}
      <footer className="grid grid-cols-12 items-stretch gap-3 border-t border-slate-300 pt-2.5">
        <div className="col-span-5 flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-700">
              Legenda 7 Status Kavling
            </span>
            <span className="text-[8.5px] font-semibold text-amber-800">
              Garis Putus = Belum Lock
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {STATUS_ORDER.map((statusKey) => {
              const meta = STATUS_CONFIG[statusKey];
              return (
                <div key={statusKey} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{
                      backgroundColor: meta.color,
                      border: meta.isDashed
                        ? `1.5px dashed ${meta.darkStroke}`
                        : `1px solid ${meta.darkStroke}`,
                    }}
                  />
                  <div className="min-w-0 truncate text-[9px] font-bold leading-tight text-slate-900">
                    {meta.label}
                    {meta.subLabel && (
                      <span className="font-semibold text-slate-600">
                        {' '}
                        ({meta.subLabel})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-7 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-[9.5px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-2 py-1 text-left font-bold">Rekap Status</th>
                {STATUS_ORDER.map((s) => (
                  <th key={s} className="px-1.5 py-1 text-center font-bold">
                    {STATUS_CONFIG[s].shortLabel}
                  </th>
                ))}
                <th className="px-2 py-1 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200 bg-white">
                <td className="px-2 py-1.5 font-bold text-slate-700">Jumlah Unit</td>
                {STATUS_ORDER.map((s) => (
                  <td
                    key={s}
                    className="px-1.5 py-1.5 text-center font-mono font-extrabold text-slate-900"
                  >
                    {stats.byStatus[s]}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right font-mono font-black text-slate-900">
                  {stats.total}
                </td>
              </tr>
              <tr className="bg-slate-50">
                <td className="px-2 py-1.5 font-bold text-slate-700">Persentase</td>
                {STATUS_ORDER.map((s) => (
                  <td
                    key={s}
                    className="px-1.5 py-1.5 text-center font-mono font-semibold text-slate-700"
                  >
                    {formatPercent(stats.byStatus[s], stats.total)}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right font-mono font-bold text-slate-900">
                  100%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </footer>
    </article>
  );
}
