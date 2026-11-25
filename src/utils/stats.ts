import { STATUS_ORDER } from '../constants/statuses';
import type { KavlingStatus, KavlingUnit, SiteplanProject } from '../types/siteplan';

export interface StatusCounts {
  total: number;
  byStatus: Record<KavlingStatus, number>;
  lastUpdatedAt: string;
}

function emptyCounts(): Record<KavlingStatus, number> {
  return {
    open: 0,
    minat: 0,
    booking: 0,
    sp3k: 0,
    akad: 0,
    cash: 0,
    reject: 0,
  };
}

export function computeUnitsStats(units: KavlingUnit[]): StatusCounts {
  const byStatus = emptyCounts();
  let latestTs = '';

  for (const u of units) {
    byStatus[u.status] += 1;
    if (!latestTs || u.updatedAt > latestTs) {
      latestTs = u.updatedAt;
    }
  }

  return {
    total: units.length,
    byStatus,
    lastUpdatedAt: latestTs || new Date().toISOString(),
  };
}

export function computeProjectsAggregate(projects: SiteplanProject[]): StatusCounts {
  const byStatus = emptyCounts();
  let total = 0;
  let latestTs = '';

  for (const project of projects) {
    const s = computeUnitsStats(project.units);
    total += s.total;
    for (const status of STATUS_ORDER) {
      byStatus[status] += s.byStatus[status];
    }
    if (!latestTs || s.lastUpdatedAt > latestTs) {
      latestTs = s.lastUpdatedAt;
    }
  }

  return {
    total,
    byStatus,
    lastUpdatedAt: latestTs || new Date().toISOString(),
  };
}
