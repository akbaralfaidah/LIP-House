export type KavlingStatus =
  | 'open'
  | 'minat'
  | 'booking'
  | 'sp3k'
  | 'akad'
  | 'cash'
  | 'reject';

export type UserRole = 'admin' | 'pimpinan' | 'marketing';

export type ProjectId =
  | 'lip-residence-1-mendalo'
  | 'lip-residence-2-mayang'
  | 'lip-residence-3-kenali'
  | 'lip-residence-4-paal-merah';

/**
 * Strictly adheres to PRD §3:
 * No land area, building area, or technical unit specs — only id, blockCode,
 * status, updatedAt, updatedBy, note, plus geometric CAD placement coordinates.
 */
export interface KavlingUnit {
  id: string;
  blockCode: string;
  blockGroup: string;
  status: KavlingStatus;
  updatedAt: string;
  updatedBy: string;
  note: string;
  // Vector layout coordinates inside project local CAD space
  x: number;
  y: number;
  width: number;
  height: number;
  /** Street-facing side to draw a subtle architectural building setback line */
  frontSide?: 'top' | 'bottom' | 'left' | 'right';
}

export interface RoadSegment {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  label?: string;
  labelX?: number;
  labelY?: number;
  labelRotate?: number;
  isMain?: boolean;
}

export interface CadRoadPath {
  id: string;
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  label?: string;
  labelX?: number;
  labelY?: number;
  labelRotate?: number;
}

export interface CadGreenZone {
  id: string;
  points?: string;
  d?: string;
  kind: 'rth' | 'pond' | 'median' | 'court' | 'masjid-plaza' | 'oval-plaza';
  label?: string;
  sublabel?: string;
  labelX?: number;
  labelY?: number;
  labelRotate?: number;
}

export interface FacilityArea {
  id: string;
  kind: 'masjid' | 'park' | 'gate' | 'playground' | 'hall' | 'parking';
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
}

export interface BlockBanner {
  id: string;
  label: string;
  x: number;
  y: number;
  rotate?: number;
}

export interface SiteRotation {
  angleDeg: number;
  cx: number;
  cy: number;
  offsetX?: number;
  offsetY?: number;
}

export interface SiteplanDecoration {
  /** Optional whole-site CAD angle rotation (e.g. Nava Town 3 / Nava Village 4) */
  siteRotation?: SiteRotation;
  /** Outer parcel boundary path inside local CAD space */
  boundaryPath: string;
  /** Crimson CAD dashed site perimeter line */
  redBoundaryPath?: string;
  /** Custom angled/curved CAD road polygons (e.g. JALAN ROW 10 or curved entrance) */
  roadPaths?: CadRoadPath[];
  /** Architectural olive-green RTH wedges, detention ponds, medians & linear parks */
  greenZones?: CadGreenZone[];
  /** Decorative road centerlines inside local CAD space */
  centerLines: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  /** Roundabouts inside local CAD space */
  roundabouts?: Array<{
    cx: number;
    cy: number;
    outerR: number;
    innerR: number;
    rxOuter?: number;
    ryOuter?: number;
    rxInner?: number;
    ryInner?: number;
    plazaFill?: string;
    label?: string;
  }>;
  /** CAD Sheet title inside upright double-border frame */
  sheetTitle: string;
  sheetSubtitle?: string;
  sheetTitlePos: { x: number; y: number; align?: 'start' | 'end' };
  /** SITEPLAN · SKALA NTS stamp position (upright) */
  scaleStampPos: { x: number; y: number };
  /** Compass style & upright position */
  compassVariant: 'eight-point' | 'classic-circle';
  compassPos: { x: number; y: number };
}

export interface SiteplanProject {
  id: ProjectId;
  shortName: string;
  name: string;
  areaLabel: string;
  blocksSummary: string;
  viewBox: { width: number; height: number };
  roads: RoadSegment[];
  facilities: FacilityArea[];
  blockBanners: BlockBanner[];
  decoration: SiteplanDecoration;
  units: KavlingUnit[];
}

export interface ActivityLogEntry {
  id: string;
  projectId: ProjectId;
  projectName: string;
  unitId: string;
  blockCode: string;
  previousStatus: KavlingStatus;
  newStatus: KavlingStatus;
  note: string;
  updatedBy: string;
  timestamp: string;
}

export interface SiteplanStoreState {
  projects: SiteplanProject[];
  activityLog: ActivityLogEntry[];
}
