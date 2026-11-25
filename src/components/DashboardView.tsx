import {
  ArrowRight,
  Clock,
  FileDown,
  Filter,
  History,
  Printer,
} from 'lucide-react';
import { ROLE_CONFIG, STATUS_CONFIG, STATUS_ORDER } from '../constants/statuses';
import type {
  ActivityLogEntry,
  KavlingStatus,
  ProjectId,
  SiteplanProject,
  UserRole,
} from '../types/siteplan';
import { formatPercent, formatShortTimeID } from '../utils/formatters';
import { computeProjectsAggregate, computeUnitsStats } from '../utils/stats';
import { SiteplanSvg } from './SiteplanSvg';

interface DashboardViewProps {
  projects: SiteplanProject[];
  activityLog: ActivityLogEntry[];
  role: UserRole;
  onOpenProject: (
    projectId: ProjectId,
    options?: { filterStatuses?: KavlingStatus[]; focusUnitId?: string }
  ) => void;
  onExportAllPdf: () => void;
  onExportSinglePdf: (projectId: ProjectId) => void;
}

export function DashboardView({
  projects,
  activityLog,
  role,
  onOpenProject,
  onExportAllPdf,
  onExportSinglePdf,
}: DashboardViewProps) {
  const aggregate = computeProjectsAggregate(projects);
  const roleMeta = ROLE_CONFIG[role];

  const lockedAndSold =
    aggregate.byStatus.booking +
    aggregate.byStatus.sp3k +
    aggregate.byStatus.akad +
    aggregate.byStatus.cash;
  const marketableCount = aggregate.byStatus.open + aggregate.byStatus.minat;

  return (
    <main className="mx-auto max-w-[1440px] space-y-5 px-4 py-5 sm:px-6">
      {/* Compact Overview Bar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
              {role === 'admin' && 'Ringkasan 4 Lokasi'}
              {role === 'pimpinan' && 'Monitoring Eksekutif'}
              {role === 'marketing' && 'Ketersediaan Kavling'}
            </h1>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {formatShortTimeID(aggregate.lastUpdatedAt)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {role === 'marketing' && (
              <button
                type="button"
                onClick={() =>
                  onOpenProject(projects[0].id, {
                    filterStatuses: ['open', 'minat'],
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 sm:text-sm cursor-pointer"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Open &amp; Minat</span>
              </button>
            )}
            <button
              type="button"
              onClick={onExportAllPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 sm:text-sm cursor-pointer"
            >
              <FileDown className="h-4 w-4 text-sky-300" />
              <span>Export Semua Siteplan (1 PDF)</span>
            </button>
          </div>
        </div>

        {/* Stacked Portfolio Progress */}
        <div className="mt-4">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="font-bold text-slate-900">
              Total <span className="font-mono">{aggregate.total}</span> Unit
            </span>
            <span className="font-semibold text-emerald-700">
              Open + Minat (Belum Lock): <span className="font-mono">{marketableCount}</span> (
              {formatPercent(marketableCount, aggregate.total)})
            </span>
            <span className="font-semibold text-blue-800">
              Terlock &amp; Terjual: <span className="font-mono">{lockedAndSold}</span> (
              {formatPercent(lockedAndSold, aggregate.total)})
            </span>
          </div>

          <div
            className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80"
            role="img"
            aria-label="Distribusi 7 status kavling"
          >
            {STATUS_ORDER.map((statusKey) => {
              const count = aggregate.byStatus[statusKey];
              if (count === 0) return null;
              const widthPct = (count / aggregate.total) * 100;
              const meta = STATUS_CONFIG[statusKey];
              return (
                <div
                  key={statusKey}
                  style={{ width: `${widthPct}%`, backgroundColor: meta.color }}
                  title={`${meta.label}: ${count} (${formatPercent(count, aggregate.total)})`}
                  className="h-full transition-all duration-300"
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* 7 Official Status KPI Cards — Clean & Scannable */}
      <section aria-label="KPI 7 Status Kavling">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {STATUS_ORDER.map((statusKey) => {
            const meta = STATUS_CONFIG[statusKey];
            const count = aggregate.byStatus[statusKey];
            const pct = formatPercent(count, aggregate.total);

            return (
              <button
                key={statusKey}
                type="button"
                onClick={() =>
                  onOpenProject(projects[0].id, { filterStatuses: [statusKey] })
                }
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-2xs transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm cursor-pointer"
              >
                <div
                  className="absolute inset-x-3 top-0 h-1 rounded-b-full"
                  style={{ backgroundColor: meta.color }}
                />

                <div className="flex items-center justify-between gap-1.5 pt-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-[3px]"
                      style={{
                        backgroundColor: meta.color,
                        border: meta.isDashed
                          ? `1.5px dashed ${meta.darkStroke}`
                          : `1px solid ${meta.darkStroke}`,
                      }}
                    />
                    <span className="truncate text-xs font-bold text-slate-800">
                      {meta.label}
                    </span>
                  </div>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                    {pct}
                  </span>
                </div>

                <div className="mt-2.5 flex items-baseline justify-between gap-2">
                  <span className="font-mono text-2xl font-extrabold tracking-tight text-slate-900">
                    {count}
                  </span>
                  {meta.subLabel && (
                    <span
                      className="truncate text-[10px] font-bold"
                      style={{ color: meta.softText }}
                    >
                      {meta.subLabel}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4 Housing Project Cards */}
      <section aria-label="4 Lokasi Siteplan">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.map((project, index) => {
            const stats = computeUnitsStats(project.units);
            const openAndMinat = stats.byStatus.open + stats.byStatus.minat;

            return (
              <article
                key={project.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-900 font-mono text-[11px] font-bold text-white">
                        {index + 1}
                      </span>
                      <h2 className="truncate text-sm font-extrabold text-slate-900 sm:text-base">
                        {project.name}
                      </h2>
                    </div>

                    <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-extrabold text-slate-800">
                      {stats.total} unit
                    </span>
                  </div>

                  {/* Live Mini CAD Siteplan */}
                  <div
                    onClick={() => onOpenProject(project.id)}
                    className="blueprint-stage mt-3 cursor-pointer overflow-hidden rounded-xl border border-slate-200/90 p-1.5 transition hover:border-sky-300"
                    title={`Buka peta ${project.name}`}
                  >
                    <SiteplanSvg
                      project={project}
                      mode="thumbnail"
                      className="h-32 w-full sm:h-36"
                    />
                  </div>

                  {/* Mini Distribution Bar + Compact Counts */}
                  <div className="mt-3 space-y-2">
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      {STATUS_ORDER.map((statusKey) => {
                        const count = stats.byStatus[statusKey];
                        if (count === 0) return null;
                        return (
                          <div
                            key={statusKey}
                            style={{
                              width: `${(count / stats.total) * 100}%`,
                              backgroundColor: STATUS_CONFIG[statusKey].color,
                            }}
                          />
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                      {STATUS_ORDER.map((statusKey) => {
                        const meta = STATUS_CONFIG[statusKey];
                        const count = stats.byStatus[statusKey];
                        return (
                          <div
                            key={statusKey}
                            className="flex items-center justify-between rounded-lg bg-slate-50 px-1.5 py-1 ring-1 ring-slate-100"
                          >
                            <span className="flex items-center gap-1 truncate text-[10px] font-semibold text-slate-600">
                              <span
                                className="h-2 w-2 shrink-0 rounded-xs"
                                style={{
                                  backgroundColor: meta.color,
                                  border: meta.isDashed
                                    ? `1px dashed ${meta.darkStroke}`
                                    : undefined,
                                }}
                              />
                              <span className="truncate">{meta.shortLabel}</span>
                            </span>
                            <span className="font-mono text-[10.5px] font-bold text-slate-900">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {formatShortTimeID(stats.lastUpdatedAt)}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onExportSinglePdf(project.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                      title={`Export PDF ${project.name}`}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>PDF</span>
                    </button>

                    {role === 'marketing' && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenProject(project.id, {
                            filterStatuses: ['open', 'minat'],
                          })
                        }
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 cursor-pointer"
                      >
                        Open/Minat ({openAndMinat})
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenProject(project.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800 cursor-pointer"
                    >
                      <span>Buka Peta</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Comparison Matrix & Activity Log — Admin & Pimpinan ONLY */}
      {roleMeta.canViewActivityLog && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 lg:col-span-7">
            <h2 className="mb-3 text-sm font-extrabold text-slate-900 sm:text-base">
              Rekap per Lokasi
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2 pr-3">Lokasi</th>
                    <th className="px-2 py-2 text-right">Total</th>
                    {STATUS_ORDER.map((s) => (
                      <th key={s} className="px-2 py-2 text-right">
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="h-2 w-2 rounded-xs"
                            style={{ backgroundColor: STATUS_CONFIG[s].color }}
                          />
                          {STATUS_CONFIG[s].shortLabel}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projects.map((p) => {
                    const s = computeUnitsStats(p.units);
                    return (
                      <tr
                        key={p.id}
                        onClick={() => onOpenProject(p.id)}
                        className="cursor-pointer transition hover:bg-slate-50"
                      >
                        <td className="py-2.5 pr-3 font-bold text-slate-900">{p.name}</td>
                        <td className="px-2 py-2.5 text-right font-mono font-bold text-slate-700">
                          {s.total}
                        </td>
                        {STATUS_ORDER.map((statusKey) => (
                          <td
                            key={statusKey}
                            className="px-2 py-2.5 text-right font-mono font-semibold text-slate-700"
                          >
                            {s.byStatus[statusKey]}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-slate-900">
                    <td className="py-2.5 pr-3">Total (4 Lokasi)</td>
                    <td className="px-2 py-2.5 text-right font-mono">{aggregate.total}</td>
                    {STATUS_ORDER.map((statusKey) => (
                      <td key={statusKey} className="px-2 py-2.5 text-right font-mono">
                        {aggregate.byStatus[statusKey]}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 lg:col-span-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <History className="h-4 w-4 text-slate-700" />
                <h2 className="text-sm font-extrabold text-slate-900 sm:text-base">
                  Log Perubahan Terakhir
                </h2>
              </div>
              <span className="font-mono text-xs font-bold text-slate-400">
                {activityLog.length}
              </span>
            </div>

            <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
              {activityLog.slice(0, 10).map((entry) => {
                const prevMeta = STATUS_CONFIG[entry.previousStatus];
                const nextMeta = STATUS_CONFIG[entry.newStatus];
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() =>
                      onOpenProject(entry.projectId, {
                        focusUnitId: entry.unitId,
                      })
                    }
                    className="w-full rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-left transition hover:border-slate-300 hover:bg-white cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">
                          {entry.blockCode}
                        </span>
                        <span className="truncate text-xs font-bold text-slate-800">
                          {entry.projectName}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-slate-400">
                        {formatShortTimeID(entry.timestamp)}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                      <span
                        className="rounded px-1.5 py-0.5"
                        style={{
                          backgroundColor: prevMeta.softBg,
                          color: prevMeta.softText,
                        }}
                      >
                        {prevMeta.label}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span
                        className="rounded px-1.5 py-0.5"
                        style={{
                          backgroundColor: nextMeta.softBg,
                          color: nextMeta.softText,
                          border: nextMeta.isDashed
                            ? `1px dashed ${nextMeta.color}`
                            : undefined,
                        }}
                      >
                        {nextMeta.label}
                      </span>
                      <span className="ml-auto text-[11px] font-medium text-slate-500">
                        {entry.updatedBy}
                      </span>
                    </div>

                    {entry.note && (
                      <p className="mt-1 line-clamp-1 text-[11px] text-slate-600">
                        {entry.note}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
