import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FileDown,
  Filter,
  Printer,
  RotateCcw,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { STATUS_CONFIG, STATUS_ORDER } from '../constants/statuses';
import type {
  KavlingStatus,
  KavlingUnit,
  ProjectId,
  SiteplanProject,
  UserRole,
} from '../types/siteplan';
import { computeUnitsStats } from '../utils/stats';
import { KavlingInspector } from './KavlingInspector';
import { getUnitTransformedCenter, SiteplanSvg } from './SiteplanSvg';

interface SiteplanViewerProps {
  projects: SiteplanProject[];
  activeProjectId: ProjectId;
  onSelectProject: (projectId: ProjectId) => void;
  role: UserRole;
  initialFilterStatuses?: KavlingStatus[];
  initialFocusUnitId?: string | null;
  onClearInitialIntent: () => void;
  onUpdateKavling: (params: {
    projectId: ProjectId;
    unitId: string;
    status: KavlingStatus;
    note: string;
    updatedBy: string;
  }) => void;
  onExportSinglePdf: (projectId: ProjectId) => void;
  onExportAllPdf: () => void;
}

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 2.8;

export function SiteplanViewer({
  projects,
  activeProjectId,
  onSelectProject,
  role,
  initialFilterStatuses,
  initialFocusUnitId,
  onClearInitialIntent,
  onUpdateKavling,
  onExportSinglePdf,
  onExportAllPdf,
}: SiteplanViewerProps) {
  const activeProject =
    projects.find((p) => p.id === activeProjectId) ?? projects[0];

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [highlightedUnitId, setHighlightedUnitId] = useState<string | null>(null);
  const [activeStatusFilters, setActiveStatusFilters] = useState<KavlingStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  }>({ active: false, startX: 0, startY: 0, originX: 0, originY: 0, moved: false });

  const pinchRef = useRef<{
    initialDist: number;
    initialZoom: number;
  } | null>(null);

  const stats = useMemo(
    () => computeUnitsStats(activeProject.units),
    [activeProject.units]
  );

  const selectedUnit = useMemo(
    () => activeProject.units.find((u) => u.id === selectedUnitId) ?? null,
    [activeProject.units, selectedUnitId]
  );

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  /**
   * Native non-passive wheel listener:
   * - Normal scroll ALWAYS scrolls the page smoothly (never hijacks scrolling!).
   * - Ctrl/Cmd + Scroll (or trackpad pinch-to-zoom) cleanly zooms the map WITHOUT scrolling the page.
   */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const onNativeWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        // Let normal page scrolling work naturally!
        return;
      }
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.16 : -0.16;
      setZoom((prev) =>
        Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((prev + delta).toFixed(2))))
      );
    };

    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => el.removeEventListener('wheel', onNativeWheel);
  }, []);

  // Center viewport smoothly on a specific unit
  const focusOnUnit = useCallback(
    (unit: KavlingUnit) => {
      setSelectedUnitId(unit.id);
      setHighlightedUnitId(unit.id);

      const stage = stageRef.current;
      if (stage) {
        const targetZoom = 1.55;
        const center = getUnitTransformedCenter(activeProject, unit);
        const unitCenterXRatio = center.x / activeProject.viewBox.width;
        const unitCenterYRatio = center.y / activeProject.viewBox.height;
        const rect = stage.getBoundingClientRect();
        const offsetX = (0.5 - unitCenterXRatio) * rect.width * 0.72 * targetZoom;
        const offsetY = (0.5 - unitCenterYRatio) * rect.height * 0.72 * targetZoom;
        setZoom(targetZoom);
        setPan({ x: offsetX, y: offsetY });
      }
    },
    [activeProject]
  );

  // Handle deep-link intent from Dashboard
  useEffect(() => {
    if (initialFilterStatuses && initialFilterStatuses.length > 0) {
      setActiveStatusFilters(initialFilterStatuses);
    }
    if (initialFocusUnitId) {
      const target = activeProject.units.find((u) => u.id === initialFocusUnitId);
      if (target) {
        focusOnUnit(target);
      }
    }
    if (initialFilterStatuses || initialFocusUnitId) {
      onClearInitialIntent();
    }
  }, [
    activeProject.units,
    focusOnUnit,
    initialFilterStatuses,
    initialFocusUnitId,
    onClearInitialIntent,
  ]);

  // Clear highlight pulse after 5.5s
  useEffect(() => {
    if (!highlightedUnitId) return;
    const timer = window.setTimeout(() => setHighlightedUnitId(null), 5500);
    return () => window.clearTimeout(timer);
  }, [highlightedUnitId]);

  const handleSwitchProject = (nextId: ProjectId) => {
    onSelectProject(nextId);
    setSelectedUnitId(null);
    setHighlightedUnitId(null);
    setSearchQuery('');
    setShowSuggestions(false);
    resetView();
  };

  // Search block code matching
  const normalizedQuery = searchQuery.trim().toUpperCase().replace(/\s+/g, '');

  const currentProjectMatches = useMemo(() => {
    if (!normalizedQuery) return [];
    return activeProject.units.filter((u) =>
      u.blockCode.toUpperCase().includes(normalizedQuery)
    );
  }, [activeProject.units, normalizedQuery]);

  const crossProjectMatches = useMemo(() => {
    if (!normalizedQuery || currentProjectMatches.length > 0) return [];
    const results: Array<{ project: SiteplanProject; unit: KavlingUnit }> = [];
    for (const p of projects) {
      if (p.id === activeProject.id) continue;
      for (const u of p.units) {
        if (u.blockCode.toUpperCase().includes(normalizedQuery)) {
          results.push({ project: p, unit: u });
        }
      }
    }
    return results.slice(0, 4);
  }, [activeProject.id, currentProjectMatches.length, normalizedQuery, projects]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizedQuery) return;
    const exact =
      activeProject.units.find((u) => u.blockCode.toUpperCase() === normalizedQuery) ??
      currentProjectMatches[0];
    if (exact) {
      if (
        activeStatusFilters.length > 0 &&
        !activeStatusFilters.includes(exact.status)
      ) {
        setActiveStatusFilters([]);
      }
      focusOnUnit(exact);
      setShowSuggestions(false);
    }
  };

  const toggleStatusFilter = (status: KavlingStatus) => {
    setActiveStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  // Mouse Drag / Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: pan.x,
      originY: pan.y,
      moved: false,
    };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStateRef.current.active) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragStateRef.current.moved = true;
    }
    setPan({
      x: dragStateRef.current.originX + dx,
      y: dragStateRef.current.originY + dy,
    });
  };

  const handleMouseUpOrLeave = () => {
    dragStateRef.current.active = false;
    setIsDragging(false);
  };

  // Touch Pan (when zoomed in) & Two-Finger Pinch Zoom (does not trap vertical scroll at 100%)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoom > 1) {
      const t = e.touches[0];
      dragStateRef.current = {
        active: true,
        startX: t.clientX,
        startY: t.clientY,
        originX: pan.x,
        originY: pan.y,
        moved: false,
      };
      pinchRef.current = null;
    } else if (e.touches.length === 2) {
      dragStateRef.current.active = false;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchRef.current = { initialDist: dist, initialZoom: zoom };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && dragStateRef.current.active) {
      const t = e.touches[0];
      const dx = t.clientX - dragStateRef.current.startX;
      const dy = t.clientY - dragStateRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragStateRef.current.moved = true;
      }
      setPan({
        x: dragStateRef.current.originX + dx,
        y: dragStateRef.current.originY + dy,
      });
    } else if (e.touches.length === 2 && pinchRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleRatio = dist / pinchRef.current.initialDist;
      const nextZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Number((pinchRef.current.initialZoom * scaleRatio).toFixed(2)))
      );
      setZoom(nextZoom);
    }
  };

  const handleTouchEnd = () => {
    dragStateRef.current.active = false;
    pinchRef.current = null;
  };

  const handleSelectUnitFromMap = useCallback((unit: KavlingUnit) => {
    if (dragStateRef.current.moved) {
      dragStateRef.current.moved = false;
      return;
    }
    setSelectedUnitId(unit.id);
  }, []);

  const isMarketingQuickActive =
    activeStatusFilters.length === 2 &&
    activeStatusFilters.includes('open') &&
    activeStatusFilters.includes('booking');

  return (
    <main className="mx-auto max-w-[1440px] space-y-3 px-3 py-4 sm:px-6">
      {/* 4-Siteplan Tabs + Export Actions */}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex gap-2 overflow-x-auto pb-0.5"
          role="tablist"
          aria-label="Pilih Lokasi Siteplan"
        >
          {projects.map((p, i) => {
            const pStats = computeUnitsStats(p.units);
            const active = p.id === activeProject.id;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleSwitchProject(p.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition cursor-pointer ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md font-mono text-[11px] font-bold ${
                    active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {i + 1}
                </span>
                <div>
                  <div className="text-xs font-extrabold leading-tight sm:text-sm">
                    {p.shortName}
                  </div>
                  <div
                    className={`font-mono text-[10px] font-semibold ${
                      active ? 'text-emerald-300' : 'text-emerald-600'
                    }`}
                  >
                    {pStats.byStatus.open} Open / {pStats.total}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onExportSinglePdf(activeProject.id)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            <span>PDF Siteplan Ini</span>
          </button>
          <button
            type="button"
            onClick={onExportAllPdf}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 cursor-pointer"
          >
            <FileDown className="h-3.5 w-3.5 text-sky-300" />
            <span>Export 4 Siteplan (1 PDF)</span>
          </button>
        </div>
      </div>

      {/* Compact Search + Color Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          {/* Block Code Search */}
          <div className="relative w-full md:max-w-xs">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Cari blok (A31, B1, C12)..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pr-16 pl-9 text-xs font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-hidden sm:text-sm"
                aria-label="Pencarian Nomor Blok Kavling"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setHighlightedUnitId(null);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-12 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-slate-800 cursor-pointer"
              >
                Cari
              </button>
            </form>

            {showSuggestions &&
              normalizedQuery &&
              (currentProjectMatches.length > 0 || crossProjectMatches.length > 0) && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  {currentProjectMatches.length > 0 ? (
                    <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto">
                      {currentProjectMatches.slice(0, 6).map((u) => {
                        const meta = STATUS_CONFIG[u.status];
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              if (
                                activeStatusFilters.length > 0 &&
                                !activeStatusFilters.includes(u.status)
                              ) {
                                setActiveStatusFilters([]);
                              }
                              focusOnUnit(u);
                              setSearchQuery(u.blockCode);
                              setShowSuggestions(false);
                            }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-50 cursor-pointer"
                          >
                            <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono font-bold text-white">
                              {u.blockCode}
                            </span>
                            <span
                              className="rounded px-2 py-0.5 text-[11px] font-bold"
                              style={{
                                backgroundColor: meta.softBg,
                                color: meta.softText,
                              }}
                            >
                              {meta.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {crossProjectMatches.map(({ project, unit }) => (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => {
                            onSelectProject(project.id);
                            setSelectedUnitId(unit.id);
                            setHighlightedUnitId(unit.id);
                            setSearchQuery('');
                            setShowSuggestions(false);
                            resetView();
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-sky-50 cursor-pointer"
                        >
                          <span className="font-semibold text-slate-800">
                            <span className="font-mono font-bold text-slate-900">
                              {unit.blockCode}
                            </span>{' '}
                            · {project.shortName}
                          </span>
                          <span className="text-[11px] font-bold text-sky-700">Pindah →</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveStatusFilters([])}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeStatusFilters.length === 0
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({stats.total})
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveStatusFilters(isMarketingQuickActive ? [] : ['open', 'booking'])
              }
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                isMarketingQuickActive
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Filter className="h-3 w-3" />
              <span>
                Open + Booking ({stats.byStatus.open + stats.byStatus.booking})
              </span>
            </button>
            {role === 'marketing' && (
              <button
                type="button"
                onClick={() =>
                  setActiveStatusFilters(
                    activeStatusFilters.length === 1 && activeStatusFilters[0] === 'open'
                      ? []
                      : ['open']
                  )
                }
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  activeStatusFilters.length === 1 && activeStatusFilters[0] === 'open'
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Hanya Open ({stats.byStatus.open})
              </button>
            )}
          </div>
        </div>

        {/* Interactive 6-Color Legend Filter */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
          {STATUS_ORDER.map((statusKey) => {
            const meta = STATUS_CONFIG[statusKey];
            const isActive = activeStatusFilters.includes(statusKey);
            const hasAnyFilter = activeStatusFilters.length > 0;
            const count = stats.byStatus[statusKey];

            return (
              <button
                key={statusKey}
                type="button"
                onClick={() => toggleStatusFilter(statusKey)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : hasAnyFilter
                    ? 'border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-[3px]"
                  style={{
                    backgroundColor: meta.color,
                    border: meta.isDashed
                      ? `1.5px dashed ${isActive ? '#FFFFFF' : meta.darkStroke}`
                      : `1px solid ${isActive ? '#FFFFFF' : meta.darkStroke}`,
                  }}
                />
                <span>{meta.label}</span>
                {meta.subLabel && (
                  <span
                    className={`hidden sm:inline text-[10px] font-medium ${
                      isActive ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    ({meta.subLabel})
                  </span>
                )}
                <span
                  className={`rounded px-1 font-mono text-[11px] ${
                    isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {activeStatusFilters.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveStatusFilters([])}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-sky-700 hover:bg-sky-50 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split Stage: SVG Canvas + Inspector */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <section className="relative flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {/* Minimal Map Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2">
            <h2 className="text-sm font-extrabold text-slate-900">
              {activeProject.name}
            </h2>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[11px] font-medium text-slate-400">
                Ctrl + Scroll untuk zoom
              </span>
              <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                {Math.round(zoom * 100)}%
              </span>
            </div>
          </div>

          {/* Pan & Zoom Surface — Normal scroll passes through cleanly to the page */}
          <div
            ref={stageRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`blueprint-stage relative h-[430px] w-full overflow-hidden sm:h-[540px] lg:h-[600px] ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{ touchAction: zoom > 1 ? 'none' : 'pan-y' }}
          >
            <div
              className="flex h-full w-full items-center justify-center p-2.5 sm:p-4"
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging
                  ? 'none'
                  : 'transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              <div className="flex h-full w-full items-center justify-center">
                <div className="w-full max-w-[920px] rounded-xl border border-slate-200/90 bg-white shadow-sm">
                  <SiteplanSvg
                    project={activeProject}
                    mode="interactive"
                    selectedUnitId={selectedUnitId}
                    highlightedUnitId={highlightedUnitId}
                    activeStatusFilters={activeStatusFilters}
                    onSelectUnit={handleSelectUnitFromMap}
                    className="block h-auto max-h-[568px] w-full rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Floating Zoom Controls */}
            <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-md backdrop-blur">
              <button
                type="button"
                onClick={() =>
                  setZoom((z) => Math.min(MAX_ZOOM, Number((z + 0.25).toFixed(2))))
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 cursor-pointer"
                title="Zoom In (+)"
                aria-label="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setZoom((z) => Math.max(MIN_ZOOM, Number((z - 0.25).toFixed(2))))
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 cursor-pointer"
                title="Zoom Out (-)"
                aria-label="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <div className="mx-1 h-px bg-slate-200" />
              <button
                type="button"
                onClick={resetView}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 cursor-pointer"
                title="Reset View"
                aria-label="Reset View"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        <KavlingInspector
          unit={selectedUnit}
          projectName={activeProject.name}
          role={role}
          onClose={() => setSelectedUnitId(null)}
          onSaveUpdate={({ unitId, status, note, updatedBy }) => {
            onUpdateKavling({
              projectId: activeProject.id,
              unitId,
              status,
              note,
              updatedBy,
            });
          }}
        />
      </div>
    </main>
  );
}
