import { useEffect, useState } from 'react';
import { Check, Clock, Lock, LockOpen, MapPin, Save, User, X } from 'lucide-react';
import { ROLE_CONFIG, STATUS_CONFIG, STATUS_ORDER } from '../constants/statuses';
import type { KavlingStatus, KavlingUnit, UserRole } from '../types/siteplan';
import { formatDateTimeID } from '../utils/formatters';

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

  const panelBody = (
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

      {/* Body */}
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
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                <Lock className="h-3 w-3" />
                Lock
              </span>
            ) : activePreviewMeta.key === 'booking' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                <LockOpen className="h-3 w-3" />
                Belum Lock
              </span>
            ) : null}
          </div>

          {(activePreviewMeta.key === 'booking' || activePreviewMeta.key === 'sp3k') && (
            <p className="mt-1 text-[11px] font-medium" style={{ color: activePreviewMeta.softText }}>
              {activePreviewMeta.key === 'booking'
                ? 'Belum terkunci, menunggu berkas lengkap.'
                : 'Berkas disetujui bank — unit terkunci.'}
            </p>
          )}
        </div>

        {/* ADMIN EDIT FORM */}
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
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
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

        {/* Compact Metadata Footer */}
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
  );

  if (isDesktop) {
    return (
      <aside className="w-[330px] shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        {panelBody}
      </aside>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="animate-sheet-up relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Detail Kavling ${unit.blockCode}`}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
        {panelBody}
      </div>
    </div>
  );
}
