import { Eye, RotateCcw, ShieldCheck, Smartphone } from 'lucide-react';
import { ROLE_CONFIG } from '../constants/statuses';
import type { UserRole } from '../types/siteplan';

interface DemoRoleBarProps {
  role: UserRole;
  onChangeRole: (role: UserRole) => void;
  onResetDemo: () => void;
}

const ROLE_ICONS: Record<UserRole, typeof ShieldCheck> = {
  admin: ShieldCheck,
  pimpinan: Eye,
  marketing: Smartphone,
};

const ROLE_ORDER: UserRole[] = ['admin', 'pimpinan', 'marketing'];

export function DemoRoleBar({ role, onChangeRole, onResetDemo }: DemoRoleBarProps) {
  return (
    <div className="no-print sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-slate-100">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2 px-3 py-1.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden text-[11px] font-bold uppercase tracking-wider text-sky-300 sm:inline">
            Mode Demo:
          </span>

          <div
            className="inline-flex items-center rounded-lg bg-slate-800/90 p-0.5 ring-1 ring-slate-700"
            role="tablist"
            aria-label="Pilih Role Demo"
          >
            {ROLE_ORDER.map((roleKey) => {
              const meta = ROLE_CONFIG[roleKey];
              const Icon = ROLE_ICONS[roleKey];
              const isActive = role === roleKey;

              return (
                <button
                  key={roleKey}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onChangeRole(roleKey)}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition sm:gap-1.5 sm:px-2.5 sm:text-xs cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{meta.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onResetDemo}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 hover:text-white sm:px-2.5 sm:text-xs cursor-pointer"
          title="Reset Data Demo"
          aria-label="Reset Data Demo"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Reset Data</span>
        </button>
      </div>
    </div>
  );
}
