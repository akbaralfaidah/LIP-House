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
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={() => onChangeTab('dashboard')}
          className="flex items-center gap-2.5 text-left cursor-pointer group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 shadow-xs transition group-hover:bg-slate-800">
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

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <nav
            className="inline-flex rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/80"
            aria-label="Navigasi Utama"
          >
            <button
              type="button"
              onClick={() => onChangeTab('dashboard')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeTab('map')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="h-4 w-4" />
              <span>Peta Siteplan</span>
            </button>
          </nav>

          <button
            type="button"
            onClick={onExportAllPdf}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 sm:px-4 sm:text-sm cursor-pointer"
          >
            <FileDown className="h-4 w-4 text-sky-300" />
            <span className="hidden sm:inline">Export 4 Siteplan (1 PDF)</span>
            <span className="sm:hidden">Export PDF</span>
          </button>
        </div>
      </div>
    </header>
  );
}
