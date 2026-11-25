import { useCallback, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AppHeader, type ActiveTab } from './components/AppHeader';
import { DashboardView } from './components/DashboardView';
import { DemoRoleBar } from './components/DemoRoleBar';
import { PdfPreviewModal, type PdfExportScope } from './components/PdfPreviewModal';
import { PdfSheetPage } from './components/PdfSheetPage';
import { SiteplanViewer } from './components/SiteplanViewer';
import { STATUS_CONFIG } from './constants/statuses';
import { useSiteplanStore } from './hooks/useSiteplanStore';
import type { KavlingStatus, ProjectId, UserRole } from './types/siteplan';
import { computeProjectsAggregate } from './utils/stats';

export default function App() {
  const { projects, activityLog, updateKavling, resetDemoData } = useSiteplanStore();

  const [role, setRole] = useState<UserRole>('admin');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<ProjectId>(projects[0].id);

  // Deep-link intent when navigating from Dashboard to SiteplanViewer
  const [viewerIntent, setViewerIntent] = useState<{
    filterStatuses?: KavlingStatus[];
    focusUnitId?: string | null;
  }>({});

  // PDF Preview & Print state
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfScope, setPdfScope] = useState<PdfExportScope>('all');
  const [printedAtIso, setPrintedAtIso] = useState<string>(() => new Date().toISOString());

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 3400);
  }, []);

  const aggregate = useMemo(() => computeProjectsAggregate(projects), [projects]);

  const handleOpenProject = useCallback(
    (
      projectId: ProjectId,
      options?: { filterStatuses?: KavlingStatus[]; focusUnitId?: string }
    ) => {
      setActiveProjectId(projectId);
      setViewerIntent({
        filterStatuses: options?.filterStatuses,
        focusUnitId: options?.focusUnitId ?? null,
      });
      setActiveTab('map');
    },
    []
  );

  const handleClearInitialIntent = useCallback(() => {
    setViewerIntent({});
  }, []);

  const handleOpenPdfExport = useCallback((scope: PdfExportScope) => {
    setPdfScope(scope);
    setPrintedAtIso(new Date().toISOString());
    setPdfModalOpen(true);
  }, []);

  const handleTriggerPrint = useCallback(() => {
    setPrintedAtIso(new Date().toISOString());
    // Allow state timestamp to flush before invoking native browser print dialog
    window.setTimeout(() => {
      window.print();
    }, 60);
  }, []);

  const handleUpdateKavling = useCallback(
    (params: {
      projectId: ProjectId;
      unitId: string;
      status: KavlingStatus;
      note: string;
      updatedBy: string;
    }) => {
      updateKavling(params);
      const targetProject = projects.find((p) => p.id === params.projectId);
      const targetUnit = targetProject?.units.find((u) => u.id === params.unitId);
      const statusLabel = STATUS_CONFIG[params.status].label;
      showToast(
        `Kavling ${targetUnit?.blockCode ?? ''} (${targetProject?.shortName ?? ''}) diperbarui ke ${statusLabel}`
      );
    },
    [projects, showToast, updateKavling]
  );

  const handleResetDemo = useCallback(() => {
    resetDemoData();
    showToast('Data demo berhasil direset ke kondisi awal.');
  }, [resetDemoData, showToast]);

  const printProjects = useMemo(
    () =>
      pdfScope === 'all'
        ? projects
        : projects.filter((project) => project.id === pdfScope),
    [pdfScope, projects]
  );

  return (
    <>
      {/* Main Interactive App Shell (hidden during @media print) */}
      <div className="no-print min-h-screen bg-slate-50 text-slate-900">
        <DemoRoleBar
          role={role}
          onChangeRole={(nextRole) => {
            setRole(nextRole);
          }}
          onResetDemo={handleResetDemo}
        />

        <AppHeader
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          role={role}
          onExportAllPdf={() => handleOpenPdfExport('all')}
          totalUnits={aggregate.total}
        />

        {activeTab === 'dashboard' ? (
          <DashboardView
            projects={projects}
            activityLog={activityLog}
            role={role}
            onOpenProject={handleOpenProject}
            onExportAllPdf={() => handleOpenPdfExport('all')}
            onExportSinglePdf={(projectId) => handleOpenPdfExport(projectId)}
          />
        ) : (
          <SiteplanViewer
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={setActiveProjectId}
            role={role}
            initialFilterStatuses={viewerIntent.filterStatuses}
            initialFocusUnitId={viewerIntent.focusUnitId}
            onClearInitialIntent={handleClearInitialIntent}
            onUpdateKavling={handleUpdateKavling}
            onExportSinglePdf={(projectId) => handleOpenPdfExport(projectId)}
            onExportAllPdf={() => handleOpenPdfExport('all')}
          />
        )}

        <div className="h-6" />
      </div>

      {/* On-Screen PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={pdfModalOpen}
        projects={projects}
        scope={pdfScope}
        activeProjectId={activeProjectId}
        printedAtIso={printedAtIso}
        onChangeScope={setPdfScope}
        onClose={() => setPdfModalOpen(false)}
        onTriggerPrint={handleTriggerPrint}
      />

      {/* Dedicated Vector Print Root (ONLY visible during @media print -> clean 4-page A4 Landscape PDF) */}
      <div className="print-only-container" aria-hidden="true">
        {printProjects.map((project, index) => (
          <PdfSheetPage
            key={project.id}
            project={project}
            pageNumber={index + 1}
            totalPages={printProjects.length}
            printedAtIso={printedAtIso}
            variant="print"
          />
        ))}
      </div>

      {/* Live Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl ring-1 ring-white/10 sm:text-sm"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
