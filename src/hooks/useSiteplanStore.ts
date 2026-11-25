import { useCallback, useEffect, useState } from 'react';
import { createSeedState } from '../data/seedData';
import type {
  ActivityLogEntry,
  KavlingStatus,
  ProjectId,
  SiteplanStoreState,
} from '../types/siteplan';

const STORAGE_KEY = 'liphouse_live_siteplan_mockup_v5';

function loadInitialState(): SiteplanStoreState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as SiteplanStoreState;
    if (
      parsed &&
      Array.isArray(parsed.projects) &&
      parsed.projects.length === 4 &&
      Array.isArray(parsed.activityLog)
    ) {
      return parsed;
    }
  } catch {
    // Fallback to clean seed state if localStorage is unavailable or corrupted
  }
  return createSeedState();
}

export function useSiteplanStore() {
  const [state, setState] = useState<SiteplanStoreState>(() => loadInitialState());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors in restricted environments
    }
  }, [state]);

  const updateKavling = useCallback(
    (params: {
      projectId: ProjectId;
      unitId: string;
      status: KavlingStatus;
      note: string;
      updatedBy: string;
    }) => {
      const { projectId, unitId, status, note, updatedBy } = params;
      const nowIso = new Date().toISOString();

      setState((prev) => {
        let logEntry: ActivityLogEntry | null = null;

        const nextProjects = prev.projects.map((project) => {
          if (project.id !== projectId) return project;

          const nextUnits = project.units.map((unit) => {
            if (unit.id !== unitId) return unit;

            logEntry = {
              id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              projectId: project.id,
              projectName: project.name,
              unitId: unit.id,
              blockCode: unit.blockCode,
              previousStatus: unit.status,
              newStatus: status,
              note: note.trim(),
              updatedBy: updatedBy.trim() || 'Admin LIP House',
              timestamp: nowIso,
            };

            return {
              ...unit,
              status,
              note: note.trim(),
              updatedBy: updatedBy.trim() || 'Admin LIP House',
              updatedAt: nowIso,
            };
          });

          return {
            ...project,
            units: nextUnits,
          };
        });

        const nextLog = logEntry
          ? [logEntry, ...prev.activityLog].slice(0, 40)
          : prev.activityLog;

        return {
          projects: nextProjects,
          activityLog: nextLog,
        };
      });
    },
    []
  );

  const resetDemoData = useCallback(() => {
    const fresh = createSeedState();
    setState(fresh);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // Ignore
    }
  }, []);

  return {
    projects: state.projects,
    activityLog: state.activityLog,
    updateKavling,
    resetDemoData,
  };
}
