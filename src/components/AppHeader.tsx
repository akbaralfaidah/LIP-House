import { FileDown, LayoutGrid, Map as MapIcon } from 'lucide-react';
import type { UserRole } from '../types/siteplan';

export type ActiveTab = 'dashboard' | 'map';

interface AppHeaderProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  role: UserRole;
  onExportAllPdf: () => void;
  totalUnits: number;
}

export function AppHeader({
  activeTab,
  onChangeTab,
  onExportAllPdf,
}: AppHeaderProps) {
  return (
    <header className="no-print border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-2.5">
        {/* Top Row on Mobile: Brand Left + Export PDF Right */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onChangeTab('dashboard')}
            className="flex items-center gap-2 text-left cursor-pointer group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 shadow-xs transition group-hover:bg-slate-800 sm:h-9 sm:w-9">
              <svg viewBox="0 0 28 28" className="h-5 w-5" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="9" height="9" rx="1.5" fill="#4E8C5F" />
                <rect x="16" y="3" width="9" height="9" rx="1.5" fill="#CC733C" />
                <rect x="3" y="16" width="9" height="9" rx="1.5" fill="#30548E" />
                <rect x="16" y="16" width="9" height="9" rx="1.5" fill="#E2E8F0" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                LIP HOUSE
              </span>
              <span className="hidden sm:inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 ring-1 ring-slate-200">
                Live Siteplan
              </span>
            </div>
          </button>

          {/* Compact Export PDF button on mobile right */}
          <button
            type="button"
            onClick={onExportAllPdf}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 sm:hidden cursor-pointer"
          >
            <FileDown className="h-3.5 w-3.5 text-sky-300" />
            <span>Export PDF</span>
          </button>
        </div>

        {/* Navigation + Desktop Export CTA */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <nav
            className="grid w-full grid-cols-2 rounded-xl bg-slate-100 p-0.5 ring-1 ring-slate-200/80 sm:inline-flex sm:w-auto sm:p-1"
            aria-label="Navigasi Utama"
          >
            <button
              type="button"
              onClick={() => onChangeTab('dashboard')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeTab('map')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Peta Siteplan</span>
            </button>
          </nav>

          <button
            type="button"
            onClick={onExportAllPdf}
            className="hidden items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-slate-800 sm:inline-flex cursor-pointer"
          >
            <FileDown className="h-4 w-4 text-sky-300" />
            <span>Export 4 Siteplan (1 PDF)</span>
          </button>
        </div>
      </div>
    </header>
  );
}
