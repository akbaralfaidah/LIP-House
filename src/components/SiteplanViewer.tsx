import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FileDown,
  Filter,
  Maximize2,
  Minimize2,
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

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

interface CameraState {
  cx: number;
  cy: number;
  zoom: number;
}

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

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

  const projW = activeProject.viewBox.width;
  const projH = activeProject.viewBox.height;

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [highlightedUnitId, setHighlightedUnitId] = useState<string | null>(null);
  const [activeStatusFilters, setActiveStatusFilters] = useState<KavlingStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // True SVG viewBox camera state (zero CSS scale blur on iOS Safari!)
  const [camera, setCamera] = useState<CameraState>({
    cx: projW / 2,
    cy: projH / 2,
    zoom: 1,
  });
  const [isDragging, setIsDragging] = useState(false);

  // Measure map viewport container so SVG viewBox matches exact pixel aspect ratio (full-bleed Retina sharp!)
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 920, height: 560 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isFullscreen]);

  // Base viewBox dimensions that fit the entire project blueprint cleanly inside current stage aspect ratio
  const baseViewSize = useMemo(() => {
    const stageAspect = stageSize.width / Math.max(1, stageSize.height);
    const projAspect = projW / projH;
    if (stageAspect >= projAspect) {
      return { width: projH * stageAspect, height: projH };
    }
    return { width: projW, height: projW / stageAspect };
  }, [projH, projW, stageSize.height, stageSize.width]);

  // Clamp camera center so user can pan across the whole blueprint without losing it off-screen
  const clampCamera = useCallback(
    (next: CameraState): CameraState => {
      const z = clamp(Number(next.zoom.toFixed(2)), MIN_ZOOM, MAX_ZOOM);
      if (z <= 1.01) {
        return { cx: projW / 2, cy: projH / 2, zoom: 1 };
      }
      const vbW = baseViewSize.width / z;
      const vbH = baseViewSize.height / z;
      const maxOffsetX = Math.max(80, (projW - vbW * 0.45) / 2);
      const maxOffsetY = Math.max(80, (projH - vbH * 0.45) / 2);
      return {
        cx: clamp(next.cx, projW / 2 - maxOffsetX, projW / 2 + maxOffsetX),
        cy: clamp(next.cy, projH / 2 - maxOffsetY, projH / 2 + maxOffsetY),
        zoom: z,
      };
    },
    [baseViewSize.height, baseViewSize.width, projH, projW]
  );

  // Active SVG viewBox derived purely from camera state
  const customViewBox = useMemo(() => {
    const vbW = baseViewSize.width / camera.zoom;
    const vbH = baseViewSize.height / camera.zoom;
    return {
      x: camera.cx - vbW / 2,
      y: camera.cy - vbH / 2,
      width: vbW,
      height: vbH,
    };
  }, [baseViewSize.height, baseViewSize.width, camera.cx, camera.cy, camera.zoom]);

  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const viewBoxRef = useRef(customViewBox);
  viewBoxRef.current = customViewBox;
  const stageSizeRef = useRef(stageSize);
  stageSizeRef.current = stageSize;

  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originCx: number;
    originCy: number;
    moved: boolean;
  }>({ active: false, startX: 0, startY: 0, originCx: projW / 2, originCy: projH / 2, moved: false });

  const pinchRef = useRef<{
    initialDist: number;
    initialZoom: number;
    anchorSvgX: number;
    anchorSvgY: number;
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
    setCamera({ cx: projW / 2, cy: projH / 2, zoom: 1 });
  }, [projH, projW]);

  const zoomBy = useCallback(
    (delta: number) => {
      setCamera((prev) => clampCamera({ ...prev, zoom: prev.zoom + delta }));
    },
    [clampCamera]
  );

  // Focus camera directly onto a searched/selected kavling in exact SVG coordinate space
  const focusOnUnit = useCallback(
    (unit: KavlingUnit) => {
      setSelectedUnitId(unit.id);
      setHighlightedUnitId(unit.id);
      const center = getUnitTransformedCenter(activeProject, unit);
      setCamera(clampCamera({ cx: center.x, cy: center.y, zoom: 2.0 }));
    },
    [activeProject, clampCamera]
  );

  /**
   * Native non-passive Wheel + Touch Listeners:
   * - Desktop plain wheel -> scrolls page naturally (never hijacks scroll!).
   * - Desktop Ctrl/Cmd + wheel -> crisp vector zoom centered on pointer WITHOUT scrolling page.
   * - Mobile 2-finger pinch -> smooth native Retina vector zoom without Safari browser zoom.
   * - Mobile 1-finger drag -> pans smoothly when zoomed > 1 or fullscreen; scrolls page naturally at 100%.
   */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;

      const vb = viewBoxRef.current;
      const pointerSvgX = vb.x + relX * vb.width;
      const pointerSvgY = vb.y + relY * vb.height;

      const cur = cameraRef.current;
      const delta = e.deltaY < 0 ? 0.22 : -0.22;
      const nextZoom = clamp(Number((cur.zoom + delta).toFixed(2)), MIN_ZOOM, MAX_ZOOM);
      const nextVbW = baseViewSize.width / nextZoom;
      const nextVbH = baseViewSize.height / nextZoom;

      const nextCx = pointerSvgX - (relX - 0.5) * nextVbW;
      const nextCy = pointerSvgY - (relY - 0.5) * nextVbH;
      setCamera(clampCamera({ cx: nextCx, cy: nextCy, zoom: nextZoom }));
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        pinchRef.current = null;
        if (cameraRef.current.zoom > 1.02 || isFullscreen) {
          const t = e.touches[0];
          dragRef.current = {
            active: true,
            startX: t.clientX,
            startY: t.clientY,
            originCx: cameraRef.current.cx,
            originCy: cameraRef.current.cy,
            moved: false,
          };
        }
      } else if (e.touches.length === 2) {
        dragRef.current.active = false;
        const rect = el.getBoundingClientRect();
        const midClientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midClientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const relX = (midClientX - rect.left) / rect.width;
        const relY = (midClientY - rect.top) / rect.height;
        const vb = viewBoxRef.current;
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchRef.current = {
          initialDist: Math.max(1, dist),
          initialZoom: cameraRef.current.zoom,
          anchorSvgX: vb.x + relX * vb.width,
          anchorSvgY: vb.y + relY * vb.height,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const midClientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midClientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const relX = (midClientX - rect.left) / rect.width;
        const relY = (midClientY - rect.top) / rect.height;

        const nextZoom = clamp(
          Number(((pinchRef.current.initialZoom * dist) / pinchRef.current.initialDist).toFixed(2)),
          MIN_ZOOM,
          MAX_ZOOM
        );
        const nextVbW = baseViewSize.width / nextZoom;
        const nextVbH = baseViewSize.height / nextZoom;
        const nextCx = pinchRef.current.anchorSvgX - (relX - 0.5) * nextVbW;
        const nextCy = pinchRef.current.anchorSvgY - (relY - 0.5) * nextVbH;
        setCamera(clampCamera({ cx: nextCx, cy: nextCy, zoom: nextZoom }));
      } else if (e.touches.length === 1 && dragRef.current.active) {
        e.preventDefault();
        const t = e.touches[0];
        const dx = t.clientX - dragRef.current.startX;
        const dy = t.clientY - dragRef.current.startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          dragRef.current.moved = true;
        }
        const vb = viewBoxRef.current;
        const sz = stageSizeRef.current;
        const scaleX = vb.width / Math.max(1, sz.width);
        const scaleY = vb.height / Math.max(1, sz.height);
        setCamera(
          clampCamera({
            cx: dragRef.current.originCx - dx * scaleX,
            cy: dragRef.current.originCy - dy * scaleY,
            zoom: cameraRef.current.zoom,
          })
        );
      }
    };

    const onTouchEnd = () => {
      dragRef.current.active = false;
      pinchRef.current = null;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [baseViewSize.height, baseViewSize.width, clampCamera, isFullscreen]);

  // Deep-link intent from Dashboard
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

  useEffect(() => {
    if (!highlightedUnitId) return;
    const timer = window.setTimeout(() => setHighlightedUnitId(null), 5500);
    return () => window.clearTimeout(timer);
  }, [highlightedUnitId]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  const handleSwitchProject = (nextId: ProjectId) => {
    onSelectProject(nextId);
    setSelectedUnitId(null);
    setHighlightedUnitId(null);
    setSearchQuery('');
    setShowSuggestions(false);
    resetView();
  };

  // Block search
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

  // Desktop Mouse Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originCx: camera.cx,
      originCy: camera.cy,
      moved: false,
    };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragRef.current.moved = true;
    }
    const scaleX = customViewBox.width / Math.max(1, stageSize.width);
    const scaleY = customViewBox.height / Math.max(1, stageSize.height);
    setCamera(
      clampCamera({
        cx: dragRef.current.originCx - dx * scaleX,
        cy: dragRef.current.originCy - dy * scaleY,
        zoom: camera.zoom,
      })
    );
  };

  const handleMouseUpOrLeave = () => {
    dragRef.current.active = false;
    setIsDragging(false);
  };

  const handleSelectUnitFromMap = useCallback((unit: KavlingUnit) => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    setSelectedUnitId(unit.id);
  }, []);

  const isMarketingQuickActive =
    activeStatusFilters.length === 2 &&
    activeStatusFilters.includes('open') &&
    activeStatusFilters.includes('booking');

  return (
    <main className="mx-auto max-w-[1440px] space-y-2.5 px-3 py-3 sm:space-y-3 sm:px-6 sm:py-4">
      {/* 4-Siteplan Horizontal Tabs + Desktop Export Actions */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5 sm:gap-2"
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
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition sm:px-3 sm:py-2 cursor-pointer ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md font-mono text-[10px] font-bold sm:text-[11px] ${
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
                      active ? 'text-emerald-300' : 'text-emerald-700'
                    }`}
                  >
                    {pStats.byStatus.open} Open/{pStats.total}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
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

      {/* Compact Mobile-Friendly Search & Horizontal-Scroll Filter Strip */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xs sm:p-3 space-y-2">
        <div className="flex items-center gap-2">
          {/* Block Search */}
          <div className="relative min-w-0 flex-1 md:max-w-xs">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Cari blok (A31, B1)..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pr-14 pl-8 text-xs font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-hidden sm:text-sm"
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
                  className="absolute right-11 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-bold text-white cursor-pointer"
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

          {/* Quick Open + Booking Filter Pill */}
          <button
            type="button"
            onClick={() =>
              setActiveStatusFilters(isMarketingQuickActive ? [] : ['open', 'booking'])
            }
            className={`inline-flex shrink-0 items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isMarketingQuickActive
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <Filter className="h-3 w-3" />
            <span className="hidden sm:inline">Open + Booking</span>
            <span className="sm:hidden">Open/Book</span>
            <span className="font-mono text-[11px]">
              ({stats.byStatus.open + stats.byStatus.booking})
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
              className={`hidden shrink-0 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition sm:inline-flex cursor-pointer ${
                activeStatusFilters.length === 1 && activeStatusFilters[0] === 'open'
                  ? 'border-green-700 bg-green-700 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Hanya Open ({stats.byStatus.open})
            </button>
          )}
        </div>

        {/* Single-Row Horizontal Scrollable 6-Color Legend Filter */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 pt-2">
          {activeStatusFilters.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveStatusFilters([])}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              <X className="h-3 w-3" />
              <span>Semua</span>
            </button>
          )}

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
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold transition sm:px-2.5 sm:text-xs cursor-pointer ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : hasAnyFilter
                    ? 'border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] sm:h-3 sm:w-3"
                  style={{
                    backgroundColor: meta.color,
                    border: meta.isDashed
                      ? `1.5px dashed ${isActive ? '#FFFFFF' : meta.darkStroke}`
                      : `1px solid ${isActive ? '#FFFFFF' : meta.darkStroke}`,
                  }}
                />
                <span>{meta.shortLabel}</span>
                {meta.subLabel && (
                  <span
                    className={`hidden md:inline text-[10px] font-medium ${
                      isActive ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    ({meta.subLabel})
                  </span>
                )}
                <span
                  className={`rounded px-1 font-mono text-[10px] sm:text-[11px] ${
                    isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split Stage: Pure Vector ViewBox SVG Map + Inspector */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <section
          className={
            isFullscreen
              ? 'fixed inset-0 z-40 flex flex-col bg-white'
              : 'relative flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs'
          }
        >
          {/* Compact Map Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2 sm:px-4">
            <h2 className="truncate text-xs font-extrabold text-slate-900 sm:text-sm">
              {activeProject.name}
            </h2>

            <div className="flex shrink-0 items-center gap-1.5">
              <span className="hidden lg:inline text-[11px] font-medium text-slate-400">
                Ctrl + Scroll untuk zoom
              </span>
              <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
                {Math.round(camera.zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => onExportSinglePdf(activeProject.id)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 lg:hidden cursor-pointer"
                title="Export PDF Siteplan Ini"
                aria-label="Export PDF Siteplan Ini"
              >
                <Printer className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen((v) => !v)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                title={isFullscreen ? 'Keluar Layar Penuh' : 'Peta Layar Penuh'}
                aria-label={isFullscreen ? 'Keluar Layar Penuh' : 'Peta Layar Penuh'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Pure Vector SVG ViewBox Interactive Canvas (ZERO CSS scale blur on iPhone Safari!) */}
          <div
            ref={stageRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className={`blueprint-stage relative w-full overflow-hidden ${
              isFullscreen
                ? 'flex-1'
                : 'h-[52vh] min-h-[340px] max-h-[540px] lg:h-[600px] lg:max-h-none'
            } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{
              touchAction: camera.zoom > 1.02 || isFullscreen ? 'none' : 'pan-y',
            }}
          >
            <SiteplanSvg
              project={activeProject}
              mode="interactive"
              selectedUnitId={selectedUnitId}
              highlightedUnitId={highlightedUnitId}
              activeStatusFilters={activeStatusFilters}
              customViewBox={customViewBox}
              onSelectUnit={handleSelectUnitFromMap}
              className="h-full w-full"
            />

            {/* Floating Zoom Controls (stayed cleanly above compact mobile dock when open) */}
            <div
              className={`absolute right-2.5 z-20 flex flex-col gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-md backdrop-blur transition-all ${
                selectedUnit ? 'top-2.5 lg:top-auto lg:bottom-3' : 'bottom-3'
              }`}
            >
              <button
                type="button"
                onClick={() => zoomBy(0.4)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 cursor-pointer"
                title="Zoom In (+)"
                aria-label="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => zoomBy(-0.4)}
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
