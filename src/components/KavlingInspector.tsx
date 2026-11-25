import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
  LockOpen,
  MapPin,
  Save,
  User,
  X,
} from 'lucide-react';
import { ROLE_CONFIG, STATUS_CONFIG, STATUS_ORDER } from '../constants/statuses';
import type { KavlingStatus, KavlingUnit, UserRole } from '../types/siteplan';
import { formatDateTimeID, formatShortTimeID } from '../utils/formatters';

interface KavlingInspectorProps {
  unit: KavlingUnit | null;
  projectName: string;
  role: UserRole;
  onClose: () => void;
  onSaveUpdate: (params: {
    unitId: string;
    status: KavlingStatus;
    note: string;
    updatedBy: string;
  }) => void;
}

const DEMO_ADMIN_NAMES = ['Rina Marlina', 'Dedi Saputra', 'Siti Rahma'] as const;

export function KavlingInspector({
  unit,
  projectName,
  role,
  onClose,
  onSaveUpdate,
}: KavlingInspectorProps) {
  const roleMeta = ROLE_CONFIG[role];
  const [draftStatus, setDraftStatus] = useState<KavlingStatus>('open');
  const [draftNote, setDraftNote] = useState('');
  const [adminName, setAdminName] = useState<string>(DEMO_ADMIN_NAMES[0]);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (unit) {
      setDraftStatus(unit.status);
      setDraftNote(unit.note);
      setMobileExpanded(false);
    }
  }, [unit]);

  if (!unit) {
    return (
      <aside className="hidden w-[330px] shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/80 p-6 text-center lg:flex">
        <MapPin className="h-6 w-6 text-slate-300" />
        <p className="mt-2.5 text-xs font-semibold text-slate-500">
          Klik kavling di peta untuk melihat{roleMeta.canEdit ? ' atau ubah' : ''} status
        </p>
      </aside>
    );
  }

  const activePreviewMeta = STATUS_CONFIG[roleMeta.canEdit ? draftStatus : unit.status];
  const isDirty =
    roleMeta.canEdit &&
    (draftStatus !== unit.status || draftNote.trim() !== unit.note.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleMeta.canEdit) return;
    onSaveUpdate({
      unitId: unit.id,
      status: draftStatus,
      note: draftNote,
      updatedBy: adminName,
    });
  };

  /* DESKTOP RIGHT SIDE PANEL */
  if (isDesktop) {
    return (
      <aside className="w-[330px] shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-slate-900 px-2.5 py-0.5 font-mono text-base font-extrabold text-white">
                  {unit.blockCode}
                </span>
                <span className="text-xs font-bold text-slate-500">{unit.blockGroup}</span>
                {!roleMeta.canEdit && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                    Read-Only
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500">{projectName}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              aria-label="Tutup panel kavling"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3.5 flex-1 space-y-3.5 overflow-y-auto">
            {/* Status & Lock Banner */}
            <div
              className="rounded-xl p-3"
              style={{
                backgroundColor: activePreviewMeta.softBg,
                border: activePreviewMeta.isDashed
                  ? `1.5px dashed ${activePreviewMeta.color}`
                  : `1px solid ${activePreviewMeta.softBorder}`,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3.5 w-3.5 rounded-[3px]"
                    style={{
                      backgroundColor: activePreviewMeta.color,
                      border: activePreviewMeta.isDashed
                        ? `1.5px dashed ${activePreviewMeta.darkStroke}`
                        : `1px solid ${activePreviewMeta.darkStroke}`,
                    }}
                  />
                  <span
                    className="text-sm font-extrabold"
                    style={{ color: activePreviewMeta.softText }}
                  >
                    {activePreviewMeta.label}
                    {activePreviewMeta.subLabel ? ` — ${activePreviewMeta.subLabel}` : ''}
                  </span>
                </div>

                {activePreviewMeta.isLocked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-800">
                    <Lock className="h-3 w-3" />
                    Terlock
                  </span>
                ) : activePreviewMeta.isDashed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    <LockOpen className="h-3 w-3" />
                    Belum Lock
                  </span>
                ) : null}
              </div>

              {(activePreviewMeta.key === 'minat' ||
                activePreviewMeta.key === 'booking' ||
                activePreviewMeta.key === 'sp3k') && (
                <p
                  className="mt-1 text-[11px] font-medium"
                  style={{ color: activePreviewMeta.softText }}
                >
                  {activePreviewMeta.description}
                </p>
              )}
            </div>

            {roleMeta.canEdit ? (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Status Kavling
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STATUS_ORDER.map((statusKey) => {
                      const meta = STATUS_CONFIG[statusKey];
                      const selected = draftStatus === statusKey;
                      return (
                        <button
                          key={statusKey}
                          type="button"
                          onClick={() => setDraftStatus(statusKey)}
                          className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition cursor-pointer ${
                            selected
                              ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                              : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-[3px]"
                            style={{
                              backgroundColor: meta.color,
                              border: meta.isDashed
                                ? `1.5px dashed ${selected ? '#FFFFFF' : meta.darkStroke}`
                                : `1px solid ${selected ? '#FFFFFF' : meta.darkStroke}`,
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-bold">{meta.label}</div>
                            {meta.subLabel && (
                              <div
                                className={`truncate text-[9.5px] font-medium ${
                                  selected ? 'text-slate-300' : 'text-slate-500'
                                }`}
                              >
                                {meta.subLabel}
                              </div>
                            )}
                          </div>
                          {selected && <Check className="h-3.5 w-3.5 shrink-0 text-sky-300" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="kavling-note-input"
                    className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    Catatan
                  </label>
                  <textarea
                    id="kavling-note-input"
                    rows={2}
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value)}
                    placeholder="Cth: Menunggu berkas KTP/KK..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-name-select"
                    className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    Admin
                  </label>
                  <select
                    id="admin-name-select"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-900 focus:outline-hidden"
                  >
                    {DEMO_ADMIN_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!isDirty}
                  className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    isDirty
                      ? 'bg-slate-900 text-white shadow-xs hover:bg-slate-800 cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Save className="h-4 w-4" />
                  <span>{isDirty ? 'Simpan Perubahan' : 'Tersimpan'}</span>
                </button>
              </form>
            ) : (
              roleMeta.canViewInternalNotes && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Catatan Admin
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-800">
                    {unit.note || '—'}
                  </p>
                </div>
              )
            )}

            <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="inline-flex items-center gap-1.5 text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  Update
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-800">
                  {formatDateTimeID(unit.updatedAt)}
                </span>
              </div>

              {roleMeta.canViewInternalNotes && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="inline-flex items-center gap-1.5 text-slate-400">
                    <User className="h-3.5 w-3.5" />
                    Oleh
                  </span>
                  <span className="font-semibold text-slate-800">{unit.updatedBy}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  /* MOBILE NON-BLOCKING COMPACT FLOATING DOCK (Map remains visible & tappable above!) */
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-2.5 pb-2.5">
      <div
        className="animate-sheet-up pointer-events-auto mx-auto max-w-md rounded-2xl border border-slate-200 bg-white/98 p-3 shadow-[0_-8px_28px_rgba(15,23,42,0.16)] backdrop-blur"
        role="region"
        aria-label={`Detail Kavling ${unit.blockCode}`}
      >
        {/* Compact Top Row: Block + Status + Time + Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-sm font-extrabold text-white">
              {unit.blockCode}
            </span>

            <span
              className="inline-flex min-w-0 items-center gap-1.5 truncate rounded-lg px-2 py-0.5 text-xs font-bold"
              style={{
                backgroundColor: activePreviewMeta.softBg,
                color: activePreviewMeta.softText,
                border: activePreviewMeta.isDashed
                  ? `1px dashed ${activePreviewMeta.color}`
                  : `1px solid ${activePreviewMeta.softBorder}`,
              }}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: activePreviewMeta.color }}
              />
              <span className="truncate">
                {activePreviewMeta.label}
                {activePreviewMeta.subLabel ? ` (${activePreviewMeta.subLabel})` : ''}
              </span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {roleMeta.canEdit && (
              <button
                type="button"
                onClick={() => setMobileExpanded((v) => !v)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label={mobileExpanded ? 'Ringkas detail' : 'Tampilkan opsi catatan & admin'}
                title="Catatan & Admin"
              >
                {mobileExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              aria-label="Tutup panel kavling"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ADMIN: Compact 7-Status Instant Chips + Inline Save Row */}
        {roleMeta.canEdit ? (
          <form onSubmit={handleSubmit} className="mt-2.5 space-y-2">
            <div className="grid grid-cols-4 gap-1.5">
              {STATUS_ORDER.map((statusKey) => {
                const meta = STATUS_CONFIG[statusKey];
                const selected = draftStatus === statusKey;
                return (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => setDraftStatus(statusKey)}
                    className={`flex items-center gap-1 rounded-lg border px-1.5 py-1.5 text-left transition cursor-pointer ${
                      selected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-800'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{
                        backgroundColor: meta.color,
                        border: meta.isDashed
                          ? `1px dashed ${selected ? '#FFFFFF' : meta.darkStroke}`
                          : undefined,
                      }}
                    />
                    <span className="truncate text-[10.5px] font-bold">{meta.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Optional Expanded Admin Details */}
            {mobileExpanded && (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px]">
                <span className="text-slate-500">Admin:</span>
                <select
                  id="admin-name-select"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-800"
                >
                  {DEMO_ADMIN_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <span className="font-mono text-[10px] text-slate-400">
                  {formatShortTimeID(unit.updatedAt)}
                </span>
              </div>
            )}

            {/* Compact Single-Line Note + Save Button */}
            <div className="flex items-center gap-1.5">
              <input
                id="kavling-note-input"
                type="text"
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="Catatan singkat..."
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!isDirty}
                className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  isDirty
                    ? 'bg-slate-900 text-white cursor-pointer'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isDirty ? 'Simpan' : 'OK'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* READ-ONLY COMPACT FOOTER FOR PIMPINAN & MARKETING */
          <div className="mt-2 space-y-1 text-xs">
            {activePreviewMeta.key === 'minat' && (
              <p className="text-[11px] font-medium text-amber-800">
                Belum terkunci — calon konsumen berminat.
              </p>
            )}
            {activePreviewMeta.key === 'booking' && (
              <p className="text-[11px] font-medium text-orange-800">
                Unit sudah terlock (booking resmi).
              </p>
            )}
            {roleMeta.canViewInternalNotes && unit.note && (
              <p className="line-clamp-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700">
                {unit.note}
              </p>
            )}
            <div className="flex items-center justify-between pt-0.5 text-[11px] text-slate-500">
              <span className="font-mono">{formatShortTimeID(unit.updatedAt)}</span>
              {roleMeta.canViewInternalNotes ? (
                <span className="font-semibold text-slate-700">{unit.updatedBy}</span>
              ) : (
                <span className="font-semibold text-slate-500">Read-Only</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
