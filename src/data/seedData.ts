import type {
  ActivityLogEntry,
  KavlingStatus,
  KavlingUnit,
  ProjectId,
  SiteplanProject,
  SiteplanStoreState,
} from '../types/siteplan';

const ADMINS = ['Rina Marlina', 'Dedi Saputra', 'Siti Rahma'] as const;

const NOTES_BY_STATUS: Record<KavlingStatus, string[]> = {
  open: ['', '', 'Kavling siap bangun, akses jalan blok sudah pengerasan', ''],
  minat: [
    'Belum lock — calon konsumen sudah survei lokasi, rencana konfirmasi pekan ini',
    'Belum lock — minat awal via marketing lapangan, jadwal kunjungan keluarga',
    'Belum lock — sudah isi form minat, masih membandingkan posisi blok',
  ],
  booking: [
    'Unit terlock — tanda jadi masuk, proses kelengkapan berkas KTP/KK',
    'Unit terlock — booking resmi tercatat, melengkapi slip gaji 3 bulan terakhir',
    'Unit terlock — verifikasi NPWP & surat keterangan kerja',
    'Unit terlock — berkas dasar masuk, antrean pengajuan bank',
  ],
  sp3k: [
    'SP3K Bank BTN terbit, menunggu jadwal akad kredit',
    'Berkas disetujui bank pelaksana, unit terlock bank',
    'SP3K aktif — persiapan validasi pajak & notaris',
  ],
  akad: [
    'Akad kredit KPR selesai via notaris rekanan',
    'Closing final — akad kredit Bank Mandiri selesai',
    'Akad kredit Bank BTN tuntas, jadwal serah terima kunci',
  ],
  cash: [
    'Pembelian cash keras lunas, serah terima kunci terjadwal',
    'Pembelian cash bertahap lunas via transfer resmi LIP House',
    'Closing final cash — proses balik nama sertifikat',
  ],
  reject: [
    'Pengajuan ditolak karena riwayat SLIK OJK / BI Checking',
    'Rasio angsuran belum memenuhi ketentuan bank, evaluasi ulang',
  ],
};

function deterministicPick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function makeTimestamp(hoursAgo: number, minsOffset: number): string {
  const base = new Date('2026-11-25T09:30:00+07:00').getTime();
  const ts = base - hoursAgo * 3600 * 1000 - minsOffset * 60 * 1000;
  return new Date(ts).toISOString();
}

function buildUnit(params: {
  projectId: ProjectId;
  blockCode: string;
  blockGroup: string;
  status: KavlingStatus;
  x: number;
  y: number;
  width: number;
  height: number;
  frontSide?: 'top' | 'bottom' | 'left' | 'right';
  seed: number;
  overrideNote?: string;
  hoursAgo?: number;
}): KavlingUnit {
  const {
    projectId,
    blockCode,
    blockGroup,
    status,
    x,
    y,
    width,
    height,
    frontSide,
    seed,
    overrideNote,
    hoursAgo,
  } = params;

  const hAgo = hoursAgo ?? ((seed * 7) % 140) + 1;
  const mOff = hoursAgo !== undefined ? 0 : (seed * 13) % 59;

  return {
    id: `${projectId}-${blockCode.toLowerCase()}`,
    blockCode,
    blockGroup,
    status,
    updatedAt: makeTimestamp(hAgo, mOff),
    updatedBy: deterministicPick(ADMINS, seed),
    note:
      overrideNote !== undefined
        ? overrideNote
        : deterministicPick(NOTES_BY_STATUS[status], seed),
    x,
    y,
    width,
    height,
    frontSide,
  };
}

/**
 * Project 1: LIP Residence 1 — Mendalo (48 Kavling: Blok A1-A31, B1-B9, C1-C8)
 * CAD Style Reference: NAVA TOWN 3
 * - Slanted +10° twin-strip parallelogram parcel
 * - Central twin-lane boulevard (ROW 5 + Green Median + ROW 5)
 * - Right angled wide main road (JALAN ROW 10)
 * - Top-left purple/green retention pond & corner green RTH wedges
 * - Tightly tessellated back-to-back CAD kavling rows + crimson dashed perimeter
 */
function buildMendaloProject(): SiteplanProject {
  const projectId: ProjectId = 'lip-residence-1-mendalo';
  const units: KavlingUnit[] = [];

  const statusPatternA: KavlingStatus[] = [
    'akad', 'cash', 'sp3k', 'sp3k', 'booking', 'open', 'open', 'minat',
    'akad', 'sp3k', 'booking', 'open', 'open', 'reject', 'sp3k', 'cash',
    'akad', 'sp3k', 'sp3k', 'booking', 'minat', 'open', 'open', 'akad',
    'sp3k', 'booking', 'open', 'minat', 'sp3k', 'akad', 'booking',
  ];

  // Blok A Row 1: A1 - A16 (touching edge-to-edge, facing North ROW 6)
  for (let i = 0; i < 16; i++) {
    const code = `A${i + 1}`;
    units.push(
      buildUnit({
        projectId,
        blockCode: code,
        blockGroup: 'Blok A',
        status: statusPatternA[i],
        x: 194 + i * 44,
        y: 158,
        width: 44,
        height: 68,
        frontSide: 'top',
        seed: 101 + i,
      })
    );
  }

  // Blok A Row 2: A17 - A31 (back-to-back touching Row 1, facing South Central Boulevard)
  for (let i = 0; i < 15; i++) {
    const code = `A${17 + i}`;
    const isA31 = code === 'A31';
    units.push(
      buildUnit({
        projectId,
        blockCode: code,
        blockGroup: 'Blok A',
        status: statusPatternA[16 + i],
        x: 194 + i * 47,
        y: 226,
        width: 47,
        height: 68,
        frontSide: 'bottom',
        seed: 130 + i,
        overrideNote: isA31
          ? 'Unit terlock — booking resmi masuk, proses berkas KTP/KK'
          : undefined,
        hoursAgo: isA31 ? 0.4 : undefined,
      })
    );
  }

  const statusPatternB: KavlingStatus[] = [
    'open', 'booking', 'minat', 'sp3k', 'open',
    'akad', 'open', 'reject', 'minat',
  ];

  // Blok B: B1 - B9 (facing North Central Boulevard, touching back-to-back with Blok C)
  for (let i = 0; i < 9; i++) {
    const code = `B${i + 1}`;
    units.push(
      buildUnit({
        projectId,
        blockCode: code,
        blockGroup: 'Blok B',
        status: statusPatternB[i],
        x: 194 + i * 70,
        y: 374,
        width: 70,
        height: 66,
        frontSide: 'top',
        seed: 160 + i,
        overrideNote:
          code === 'B1' ? 'Posisi strategis dekat Gerbang & Taman Median, siap survei' : undefined,
        hoursAgo: code === 'B1' ? 1.2 : undefined,
      })
    );
  }

  const statusPatternC: KavlingStatus[] = [
    'open', 'open', 'booking', 'sp3k',
    'minat', 'open', 'cash', 'booking',
  ];

  // Blok C: C1 - C8 (back-to-back touching Blok B, facing South ROW 6)
  for (let i = 0; i < 8; i++) {
    const code = `C${i + 1}`;
    units.push(
      buildUnit({
        projectId,
        blockCode: code,
        blockGroup: 'Blok C',
        status: statusPatternC[i],
        x: 194 + i * 70,
        y: 440,
        width: 70,
        height: 66,
        frontSide: 'bottom',
        seed: 190 + i,
      })
    );
  }

  return {
    id: projectId,
    shortName: 'Mendalo',
    name: 'LIP Residence 1 — Mendalo',
    areaLabel: 'Mendalo Darat, Muaro Jambi',
    blocksSummary: 'Blok A (A1–A31), Blok B (B1–B9), Blok C (C1–C8)',
    viewBox: { width: 1120, height: 680 },
    roads: [
      {
        id: 'm-rd-west',
        x: 164,
        y: 132,
        width: 30,
        height: 400,
        label: 'ROW 6',
        labelX: 179,
        labelY: 334,
        labelRotate: -90,
      },
      {
        id: 'm-rd-north',
        x: 164,
        y: 132,
        width: 760,
        height: 26,
        label: 'ROW 6',
        labelX: 540,
        labelY: 148,
      },
      {
        id: 'm-rd-bvd-top',
        x: 194,
        y: 294,
        width: 730,
        height: 32,
        isMain: true,
        label: 'ROW 5',
        labelX: 675,
        labelY: 313,
      },
      {
        id: 'm-rd-bvd-bot',
        x: 194,
        y: 342,
        width: 730,
        height: 32,
        isMain: true,
        label: 'ROW 5',
        labelX: 675,
        labelY: 361,
      },
      {
        id: 'm-rd-south',
        x: 164,
        y: 506,
        width: 760,
        height: 26,
        label: 'ROW 6',
        labelX: 540,
        labelY: 522,
      },
    ],
    facilities: [
      {
        id: 'm-fac-masjid',
        kind: 'masjid',
        label: 'Masjid',
        sublabel: 'Fasum',
        x: 754,
        y: 440,
        width: 70,
        height: 66,
      },
    ],
    blockBanners: [
      { id: 'm-bn-a', label: 'BLOK A', x: 198, y: 152 },
      { id: 'm-bn-b', label: 'BLOK B / C', x: 198, y: 370 },
    ],
    decoration: {
      siteRotation: { angleDeg: 10, cx: 556, cy: 345, offsetX: 8, offsetY: 24 },
      boundaryPath:
        'M 122 104 L 194 94 L 194 132 L 924 132 L 924 532 L 164 532 L 164 222 L 122 252 Z',
      redBoundaryPath:
        'M 122 104 L 194 94 L 194 132 L 924 132 L 924 532 L 164 532 L 164 222 L 122 252 Z',
      roadPaths: [
        {
          id: 'm-main-row10',
          d: 'M 924 102 L 976 92 L 992 256 L 986 544 L 934 554 L 938 256 Z',
          fill: '#E5E9F0',
          stroke: '#475569',
          strokeWidth: 1.3,
          label: 'JALAN   ROW 10',
          labelX: 961,
          labelY: 410,
          labelRotate: -90,
        },
        {
          id: 'm-west-outer-curve',
          d: 'M 140 132 L 164 132 L 164 532 L 146 532 L 146 250 Z',
          fill: '#F1F5F9',
          stroke: '#94A3B8',
          strokeWidth: 0.9,
        },
      ],
      greenZones: [
        {
          id: 'm-gz-pond-bank',
          points: '126,110 188,100 188,198 128,238',
          kind: 'rth',
        },
        {
          id: 'm-gz-pond',
          points: '134,118 178,110 174,166 136,180',
          kind: 'pond',
          label: 'KOLAM',
          labelX: 155,
          labelY: 147,
        },
        {
          id: 'm-gz-median',
          d: 'M 262 329 L 916 329 Q 924 334 916 339 L 262 339 Q 254 334 262 329 Z',
          kind: 'median',
        },
        {
          id: 'm-gz-east-rth',
          points: '828,374 916,374 916,506 828,506',
          kind: 'rth',
          label: 'RTH & TAMAN',
          labelX: 872,
          labelY: 444,
        },
      ],
      centerLines: [
        { x1: 205, y1: 310, x2: 916, y2: 310 },
        { x1: 205, y1: 358, x2: 916, y2: 358 },
      ],
      sheetTitle: 'LIP RESIDENCE 1 — MENDALO',
      sheetSubtitle: 'MENDALO DARAT, MUARO JAMBI · 48 KAVLING',
      sheetTitlePos: { x: 248, y: 58, align: 'start' },
      scaleStampPos: { x: 54, y: 618 },
      compassVariant: 'eight-point',
      compassPos: { x: 1020, y: 92 },
    },
    units,
  };
}

/**
 * Project 2: LIP Residence 2 — Mayang (54 Kavling: Blok A1-A14, B1-B14, C1-C14, D1-D12)
 * CAD Style Reference: NAVA VILLAGE 4
 * - Iconic -22° rotated diamond/pentagon estate
 * - Central Linear Park & Basketball/Sport Courtyard + West Masjid Plaza
 * - Tightly tessellated 4-quadrant back-to-back CAD blocks + ROW 6 / ROW 8 roads
 */
function buildMayangProject(): SiteplanProject {
  const projectId: ProjectId = 'lip-residence-2-mayang';
  const units: KavlingUnit[] = [];

  const statusesA: KavlingStatus[] = [
    'akad', 'cash', 'sp3k', 'booking', 'open', 'open', 'minat',
    'sp3k', 'akad', 'booking', 'open', 'minat', 'open', 'sp3k',
  ];
  const statusesB: KavlingStatus[] = [
    'open', 'open', 'minat', 'booking', 'sp3k', 'akad', 'cash',
    'open', 'booking', 'reject', 'sp3k', 'open', 'minat', 'booking',
  ];
  const statusesC: KavlingStatus[] = [
    'sp3k', 'booking', 'open', 'open', 'minat', 'akad', 'sp3k',
    'open', 'minat', 'open', 'booking', 'sp3k', 'open', 'cash',
  ];
  const statusesD: KavlingStatus[] = [
    'open', 'open', 'booking', 'minat', 'open', 'reject',
    'open', 'minat', 'booking', 'sp3k', 'open', 'open',
  ];

  // Blok A (NW Quadrant): A1-A7 top row + A8-A14 bottom row touching back-to-back
  for (let i = 0; i < 7; i++) {
    units.push(
      buildUnit({
        projectId,
        blockCode: `A${i + 1}`,
        blockGroup: 'Blok A',
        status: statusesA[i],
        x: 274 + i * 38,
        y: 174,
        width: 38,
        height: 58,
        frontSide: 'top',
        seed: 220 + i,
      })
    );
    units.push(
      buildUnit({
        projectId,
        blockCode: `A${8 + i}`,
        blockGroup: 'Blok A',
        status: statusesA[7 + i],
        x: 274 + i * 38,
        y: 232,
        width: 38,
        height: 58,
        frontSide: 'bottom',
        seed: 235 + i,
      })
    );
  }

  // Blok B (NE Quadrant): B1-B7 top + B8-B14 bottom touching back-to-back
  for (let i = 0; i < 7; i++) {
    units.push(
      buildUnit({
        projectId,
        blockCode: `B${i + 1}`,
        blockGroup: 'Blok B',
        status: statusesB[i],
        x: 568 + i * 38,
        y: 174,
        width: 38,
        height: 58,
        frontSide: 'top',
        seed: 255 + i,
      })
    );
    units.push(
      buildUnit({
        projectId,
        blockCode: `B${8 + i}`,
        blockGroup: 'Blok B',
        status: statusesB[7 + i],
        x: 568 + i * 38,
        y: 232,
        width: 38,
        height: 58,
        frontSide: 'bottom',
        seed: 270 + i,
      })
    );
  }

  // Blok C (SW Quadrant): C1-C7 top + C8-C14 bottom touching back-to-back (includes C12!)
  for (let i = 0; i < 7; i++) {
    units.push(
      buildUnit({
        projectId,
        blockCode: `C${i + 1}`,
        blockGroup: 'Blok C',
        status: statusesC[i],
        x: 274 + i * 38,
        y: 410,
        width: 38,
        height: 58,
        frontSide: 'top',
        seed: 290 + i,
      })
    );
    const codeLower = `C${8 + i}`;
    units.push(
      buildUnit({
        projectId,
        blockCode: codeLower,
        blockGroup: 'Blok C',
        status: statusesC[7 + i],
        x: 274 + i * 38,
        y: 468,
        width: 38,
        height: 58,
        frontSide: 'bottom',
        seed: 305 + i,
        overrideNote:
          codeLower === 'C12' ? 'SP3K BTN disetujui, penjadwalan akad bulan ini' : undefined,
        hoursAgo: codeLower === 'C12' ? 0.9 : undefined,
      })
    );
  }

  // Blok D (SE Quadrant): D1-D6 top + D7-D12 bottom touching back-to-back + East Corner Green RTH
  for (let i = 0; i < 6; i++) {
    units.push(
      buildUnit({
        projectId,
        blockCode: `D${i + 1}`,
        blockGroup: 'Blok D',
        status: statusesD[i],
        x: 568 + i * 38,
        y: 410,
        width: 38,
        height: 58,
        frontSide: 'top',
        seed: 325 + i,
      })
    );
    units.push(
      buildUnit({
        projectId,
        blockCode: `D${7 + i}`,
        blockGroup: 'Blok D',
        status: statusesD[6 + i],
        x: 568 + i * 38,
        y: 468,
        width: 38,
        height: 58,
        frontSide: 'bottom',
        seed: 340 + i,
      })
    );
  }

  return {
    id: projectId,
    shortName: 'Mayang',
    name: 'LIP Residence 2 — Mayang',
    areaLabel: 'Mayang Mangurai, Kota Jambi',
    blocksSummary: 'Blok A (14), Blok B (14), Blok C (14), Blok D (12)',
    viewBox: { width: 1120, height: 680 },
    roads: [
      {
        id: 'my-rd-top',
        x: 248,
        y: 150,
        width: 608,
        height: 24,
        label: 'ROW 6',
        labelX: 430,
        labelY: 165,
      },
      {
        id: 'my-rd-west',
        x: 248,
        y: 150,
        width: 26,
        height: 400,
        label: 'ROW 6',
        labelX: 261,
        labelY: 352,
        labelRotate: -90,
      },
      {
        id: 'my-rd-midv-top',
        x: 540,
        y: 150,
        width: 28,
        height: 168,
        label: 'ROW 6',
        labelX: 554,
        labelY: 235,
        labelRotate: -90,
      },
      {
        id: 'my-rd-midv-bot',
        x: 540,
        y: 382,
        width: 28,
        height: 168,
        label: 'ROW 6',
        labelX: 554,
        labelY: 468,
        labelRotate: -90,
      },
      {
        id: 'my-rd-east',
        x: 834,
        y: 150,
        width: 24,
        height: 400,
      },
      {
        id: 'my-rd-park-n',
        x: 248,
        y: 290,
        width: 610,
        height: 28,
        isMain: true,
        label: 'ROW 8  BOULEVARD TAMAN',
        labelX: 600,
        labelY: 308,
      },
      {
        id: 'my-rd-park-s',
        x: 248,
        y: 382,
        width: 610,
        height: 28,
        isMain: true,
        label: 'ROW 8',
        labelX: 600,
        labelY: 399,
      },
      {
        id: 'my-rd-bot',
        x: 248,
        y: 526,
        width: 608,
        height: 24,
        label: 'ROW 6',
        labelX: 675,
        labelY: 541,
      },
    ],
    facilities: [],
    blockBanners: [
      { id: 'my-bn-a', label: 'BLOK A', x: 276, y: 170 },
      { id: 'my-bn-b', label: 'BLOK B', x: 570, y: 170 },
      { id: 'my-bn-c', label: 'BLOK C', x: 276, y: 406 },
      { id: 'my-bn-d', label: 'BLOK D', x: 570, y: 406 },
    ],
    decoration: {
      siteRotation: { angleDeg: -19, cx: 560, cy: 350, offsetX: 14, offsetY: -12 },
      boundaryPath:
        'M 232 184 L 274 140 L 842 140 L 866 174 L 866 534 L 832 560 L 260 560 L 232 522 Z',
      redBoundaryPath:
        'M 232 184 L 274 140 L 842 140 L 866 174 L 866 534 L 832 560 L 260 560 L 232 522 Z',
      roadPaths: [
        {
          id: 'my-east-access',
          d: 'M 858 310 L 920 310 L 920 390 L 858 390 Z',
          fill: '#E5E9F0',
          stroke: '#475569',
          strokeWidth: 1.2,
          label: 'GERBANG ROW 10',
          labelX: 889,
          labelY: 354,
          labelRotate: -90,
        },
      ],
      greenZones: [
        {
          id: 'my-gz-masjid',
          d: 'M 284 322 L 352 322 L 352 378 L 284 378 Z',
          kind: 'masjid-plaza',
          label: 'MASJID',
          labelX: 318,
          labelY: 354,
        },
        {
          id: 'my-gz-central-park',
          d: 'M 378 322 L 822 322 Q 832 350 822 378 L 378 378 Q 368 350 378 322 Z',
          kind: 'court',
          label: 'TAMAN SENTRAL & SPORT COURT',
          labelX: 604,
          labelY: 354,
        },
        {
          id: 'my-gz-se-rth',
          points: '798,412 832,412 832,524 798,524',
          kind: 'rth',
          label: 'RTH',
          labelX: 815,
          labelY: 472,
          labelRotate: -90,
        },
        {
          id: 'my-gz-west-strip',
          points: '236,204 246,204 246,498 236,498',
          kind: 'rth',
        },
      ],
      centerLines: [
        { x1: 266, y1: 304, x2: 850, y2: 304 },
        { x1: 266, y1: 396, x2: 850, y2: 396 },
      ],
      sheetTitle: 'LIP RESIDENCE 2 — MAYANG',
      sheetSubtitle: 'MAYANG MANGURAI, KOTA JAMBI · 54 KAVLING',
      sheetTitlePos: { x: 46, y: 58, align: 'start' },
      scaleStampPos: { x: 862, y: 618 },
      compassVariant: 'classic-circle',
      compassPos: { x: 96, y: 576 },
    },
    units,
  };
}

/**
 * Project 3: LIP Residence 3 — Kenali (42 Kavling: Blok A1-A22, Blok B1-B20)
 * CAD Style Reference: NAVA VILLAGE 5
 * - Tapered trapezoid wedge parcel (narrow north, wide south, angled east boundary)
 * - Dual vertical touching west spine columns (Blok A)
 * - Widening horizontal terraced cul-de-sac rows along angled east side (Blok B)
 * - Bottom entrance roundabout, purple/green retention pond & curved ROW 8 road with stubs
 */
function buildKenaliProject(): SiteplanProject {
  const projectId: ProjectId = 'lip-residence-3-kenali';
  const units: KavlingUnit[] = [];

  const statusesA: KavlingStatus[] = [
    'akad', 'cash', 'sp3k', 'sp3k', 'booking', 'open', 'minat', 'open',
    'sp3k', 'akad', 'booking', 'open',
    'akad', 'sp3k', 'booking', 'open',
    'open', 'minat', 'booking', 'open', 'reject', 'sp3k',
  ];

  const statusesB: KavlingStatus[] = [
    'akad', 'sp3k', 'booking', 'open', 'open',
    'minat', 'open', 'booking', 'sp3k', 'cash',
    'open', 'open', 'minat', 'booking', 'open',
    'reject', 'open', 'minat', 'sp3k', 'open',
  ];

  // Blok A West Outer Column: A1 - A11 (11 tightly stacked lots facing East ROW 6)
  for (let i = 0; i < 11; i++) {
    units.push(
      buildUnit({
        projectId,
        blockCode: `A${i + 1}`,
        blockGroup: 'Blok A',
        status: statusesA[i],
        x: 314,
        y: 88 + i * 37,
        width: 64,
        height: 37,
        frontSide: 'right',
        seed: 401 + i,
      })
    );
  }

  // Blok A Inner West Column: A12 - A22 (11 tightly stacked lots facing West ROW 6 / East ROW 8)
  for (let i = 0; i < 11; i++) {
    units.push(
      buildUnit({
        projectId,
        blockCode: `A${12 + i}`,
        blockGroup: 'Blok A',
        status: statusesA[11 + i],
        x: 408,
        y: 88 + i * 37,
        width: 64,
        height: 37,
        frontSide: 'left',
        seed: 420 + i,
      })
    );
  }

  // Blok B East Tapered Tiers (widening downward to follow the slanted eastern CAD boundary!)
  // Tier 1: B1 - B3 (3 lots)
  for (let i = 0; i < 3; i++) {
    units.push(
      buildUnit({
        projectId,
        blockCode: `B${i + 1}`,
        blockGroup: 'Blok B',
        status: statusesB[i],
        x: 506 + i * 48,
        y: 118,
        width: 48,
        height: 54,
        frontSide: 'bottom',
        seed: 445 + i,
      })
    );
  }

  // Tier 2: B4 - B7 (4 lots)
  for (let i = 0; i < 4; i++) {
    units.push(
      buildUnit({
        projectId,
        blockCode: `B${4 + i}`,
        blockGroup: 'Blok B',
        status: statusesB[3 + i],
        x: 506 + i * 48,
        y: 198,
        width: 48,
        height: 54,
        frontSide: 'bottom',
        seed: 455 + i,
      })
    );
  }

  // Tier 3: B8 - B11 (4 lots)
  for (let i = 0; i < 4; i++) {
    units.push(
      buildUnit({
        projectId,
        blockCode: `B${8 + i}`,
        blockGroup: 'Blok B',
        status: statusesB[7 + i],
        x: 506 + i * 52,
        y: 278,
        width: 52,
        height: 54,
        frontSide: 'bottom',
        seed: 468 + i,
      })
    );
  }

  // Tier 4: B12 - B15 (4 lots)
  for (let i = 0; i < 4; i++) {
    units.push(
      buildUnit({
        projectId,
        blockCode: `B${12 + i}`,
        blockGroup: 'Blok B',
        status: statusesB[11 + i],
        x: 506 + i * 56,
        y: 358,
        width: 56,
        height: 54,
        frontSide: 'bottom',
        seed: 480 + i,
      })
    );
  }

  // Tier 5: B16 - B20 (5 lots — widest base row)
  for (let i = 0; i < 5; i++) {
    units.push(
      buildUnit({
        projectId,
        blockCode: `B${16 + i}`,
        blockGroup: 'Blok B',
        status: statusesB[15 + i],
        x: 506 + i * 52,
        y: 438,
        width: 52,
        height: 56,
        frontSide: 'bottom',
        seed: 494 + i,
      })
    );
  }

  return {
    id: projectId,
    shortName: 'Kenali',
    name: 'LIP Residence 3 — Kenali',
    areaLabel: 'Kenali Asam Bawah, Kota Jambi',
    blocksSummary: 'Blok A (A1–A22), Blok B (B1–B20)',
    viewBox: { width: 1120, height: 680 },
    roads: [
      {
        id: 'kn-rd-west-mid',
        x: 378,
        y: 80,
        width: 30,
        height: 432,
        label: 'ROW 6',
        labelX: 393,
        labelY: 292,
        labelRotate: -90,
      },
      {
        id: 'kn-rd-center-bvd',
        x: 472,
        y: 80,
        width: 34,
        height: 470,
        isMain: true,
        label: 'ROW 8',
        labelX: 489,
        labelY: 292,
        labelRotate: -90,
      },
      {
        id: 'kn-rd-b1',
        x: 506,
        y: 172,
        width: 170,
        height: 26,
        label: 'ROW 6',
        labelX: 590,
        labelY: 188,
      },
      {
        id: 'kn-rd-b2',
        x: 506,
        y: 252,
        width: 204,
        height: 26,
        label: 'ROW 6',
        labelX: 604,
        labelY: 268,
      },
      {
        id: 'kn-rd-b3',
        x: 506,
        y: 332,
        width: 234,
        height: 26,
        label: 'ROW 6',
        labelX: 616,
        labelY: 348,
      },
      {
        id: 'kn-rd-b4',
        x: 506,
        y: 412,
        width: 260,
        height: 26,
        label: 'ROW 6',
        labelX: 632,
        labelY: 428,
      },
      {
        id: 'kn-rd-b5',
        x: 506,
        y: 494,
        width: 288,
        height: 26,
        label: 'ROW 6',
        labelX: 646,
        labelY: 510,
      },
    ],
    facilities: [
      {
        id: 'kn-fac-masjid',
        kind: 'masjid',
        label: 'Masjid Nurul Iman',
        sublabel: 'Fasum Ibadah',
        x: 546,
        y: 526,
        width: 146,
        height: 48,
      },
      {
        id: 'kn-fac-gate',
        kind: 'gate',
        label: 'GERBANG',
        sublabel: 'Pos Security',
        x: 702,
        y: 526,
        width: 82,
        height: 48,
      },
    ],
    blockBanners: [
      { id: 'kn-bn-a', label: 'BLOK A', x: 316, y: 80 },
      { id: 'kn-bn-b', label: 'BLOK B', x: 510, y: 110 },
    ],
    decoration: {
      siteRotation: { angleDeg: -3, cx: 550, cy: 340, offsetX: 0, offsetY: -14 },
      boundaryPath:
        'M 304 66 L 626 98 L 690 218 L 762 358 L 818 584 L 516 584 L 466 574 L 304 516 Z',
      redBoundaryPath:
        'M 304 66 L 626 98 L 690 218 L 762 358 L 818 584 L 516 584 L 466 574 L 304 516 Z',
      roadPaths: [
        {
          id: 'kn-east-ring',
          d: 'M 626 98 L 648 92 L 842 586 L 818 584 L 762 358 L 690 218 Z',
          fill: '#E5E9F0',
          stroke: '#64748B',
          strokeWidth: 1,
          label: 'JALAN TIMUR',
          labelX: 742,
          labelY: 294,
          labelRotate: 64,
        },
        {
          id: 'kn-south-curved-access',
          d: 'M 272 518 L 494 584 L 844 590 L 850 618 L 486 612 L 260 544 Z',
          fill: '#E5E9F0',
          stroke: '#475569',
          strokeWidth: 1.2,
          label: 'JALAN AKSES UTAMA ROW 8',
          labelX: 650,
          labelY: 608,
        },
        // Authentic CAD connecting road stubs on south edge (Nava Village 5 detail!)
        {
          id: 'kn-stub-1',
          d: 'M 334 562 L 352 568 L 330 616 L 312 610 Z',
          fill: '#F1F5F9',
          stroke: '#94A3B8',
          strokeWidth: 0.9,
        },
        {
          id: 'kn-stub-2',
          d: 'M 432 592 L 450 598 L 430 640 L 412 634 Z',
          fill: '#F1F5F9',
          stroke: '#94A3B8',
          strokeWidth: 0.9,
        },
      ],
      greenZones: [
        {
          id: 'kn-gz-pond-bank',
          points: '312,516 456,516 452,566 322,528',
          kind: 'rth',
        },
        {
          id: 'kn-gz-pond',
          points: '344,522 442,524 434,556 350,534',
          kind: 'pond',
          label: 'KOLAM & RTH',
          labelX: 396,
          labelY: 540,
        },
        {
          id: 'kn-gz-ne-wedge',
          points: '506,88 616,102 642,118 506,118',
          kind: 'rth',
        },
      ],
      centerLines: [{ x1: 489, y1: 96, x2: 489, y2: 520 }],
      roundabouts: [
        {
          cx: 489,
          cy: 556,
          outerR: 28,
          innerR: 13,
          label: 'TMN',
        },
      ],
      sheetTitle: 'LIP RESIDENCE 3 — KENALI',
      sheetSubtitle: 'KENALI ASAM BAWAH, KOTA JAMBI · 42 KAVLING',
      sheetTitlePos: { x: 1068, y: 60, align: 'end' },
      scaleStampPos: { x: 866, y: 616 },
      compassVariant: 'classic-circle',
      compassPos: { x: 108, y: 580 },
    },
    units,
  };
}

/**
 * Project 4: LIP Residence 4 — Paal Merah (56 Kavling: Blok A1-A16, B1-B16, C1-C12, D1-D12)
 * CAD Style Reference: GRAND CITRA ASRI PUDAK
 * - Stepped asymmetric polygon estate (elevated north-east roof, tapered southern tail)
 * - Central horizontal twin-lane boulevard (ROW 12) with West Entrance Circle & Iconic Central Elliptical Roundabout Plaza
 * - Vertical terraced back-to-back CAD fingers (Blok A, B, C, D) + Central Masjid Square Courtyard
 */
function buildPaalMerahProject(): SiteplanProject {
  const projectId: ProjectId = 'lip-residence-4-paal-merah';
  const units: KavlingUnit[] = [];

  const statusesA: KavlingStatus[] = [
    'akad', 'sp3k', 'booking', 'open', 'open', 'minat', 'sp3k', 'cash',
    'open', 'booking', 'minat', 'open', 'open', 'reject', 'booking', 'sp3k',
  ];
  const statusesB: KavlingStatus[] = [
    'open', 'open', 'minat', 'booking', 'sp3k', 'open', 'cash', 'open',
    'booking', 'open', 'open', 'minat', 'sp3k', 'open', 'booking', 'open',
  ];
  const statusesC: KavlingStatus[] = [
    'open', 'minat', 'open', 'booking', 'open', 'sp3k',
    'open', 'open', 'booking', 'minat', 'open', 'open',
  ];
  const statusesD: KavlingStatus[] = [
    'open', 'open', 'open', 'minat', 'booking', 'open',
    'open', 'reject', 'open', 'minat', 'open', 'booking',
  ];

  // Blok A (North-West Stepped Lower Wing: 16 lots = 2 back-to-back vertical fingers of 4x2)
  for (let i = 0; i < 4; i++) {
    units.push(
      buildUnit({
        projectId,
        blockCode: `A${i + 1}`,
        blockGroup: 'Blok A',
        status: statusesA[i],
        x: 244,
        y: 120 + i * 36,
        width: 50,
        height: 36,
        frontSide: 'left',
        seed: 510 + i,
      })
    );
    units.push(
      buildUnit({
        projectId,
        blockCode: `A${5 + i}`,
        blockGroup: 'Blok A',
        status: statusesA[4 + i],
        x: 294,
        y: 120 + i * 36,
        width: 50,
        height: 36,
        frontSide: 'right',
        seed: 518 + i,
      })
    );
    units.push(
      buildUnit({
        projectId,
        blockCode: `A${9 + i}`,
        blockGroup: 'Blok A',
        status: statusesA[8 + i],
        x: 374,
        y: 120 + i * 36,
        width: 50,
        height: 36,
        frontSide: 'left',
        seed: 526 + i,
      })
    );
    units.push(
      buildUnit({
        projectId,
        blockCode: `A${13 + i}`,
        blockGroup: 'Blok A',
        status: statusesA[12 + i],
        x: 424,
        y: 120 + i * 36,
        width: 50,
        height: 36,
        frontSide: 'right',
        seed: 534 + i,
      })
    );
  }

  // Blok B (North-East Stepped Higher Wing: 16 lots = 2 back-to-back vertical fingers of 4x2)
  for (let i = 0; i < 4; i++) {
    units.push(
      buildUnit({
        projectId,
        blockCode: `B${i + 1}`,
        blockGroup: 'Blok B',
        status: statusesB[i],
        x: 506,
        y: 80 + i * 46,
        width: 52,
        height: 46,
        frontSide: 'left',
        seed: 545 + i,
      })
    );
    units.push(
      buildUnit({
        projectId,
        blockCode: `B${5 + i}`,
        blockGroup: 'Blok B',
        status: statusesB[4 + i],
        x: 558,
        y: 80 + i * 46,
        width: 52,
        height: 46,
        frontSide: 'right',
        seed: 553 + i,
      })
    );
    units.push(
      buildUnit({
        projectId,
        blockCode: `B${9 + i}`,
        blockGroup: 'Blok B',
        status: statusesB[8 + i],
        x: 640,
        y: 80 + i * 46,
        width: 52,
        height: 46,
        frontSide: 'left',
        seed: 561 + i,
      })
    );
    units.push(
      buildUnit({
        projectId,
        blockCode: `B${13 + i}`,
        blockGroup: 'Blok B',
        status: statusesB[12 + i],
        x: 692,
        y: 80 + i * 46,
        width: 52,
        height: 46,
        frontSide: 'right',
        seed: 569 + i,
      })
    );
  }

  // Blok C (South-West Tapered Wing: C1-C6 left + C7-C12 right touching back-to-back)
  for (let i = 0; i < 6; i++) {
    units.push(
      buildUnit({
        projectId,
        blockCode: `C${i + 1}`,
        blockGroup: 'Blok C',
        status: statusesC[i],
        x: 422,
        y: 332 + i * 38,
        width: 52,
        height: 38,
        frontSide: 'left',
        seed: 580 + i,
      })
    );
    units.push(
      buildUnit({
        projectId,
        blockCode: `C${7 + i}`,
        blockGroup: 'Blok C',
        status: statusesC[6 + i],
        x: 474,
        y: 332 + i * 38,
        width: 52,
        height: 38,
        frontSide: 'right',
        seed: 590 + i,
      })
    );
  }

  // Blok D (South-East Wing below Masjid Courtyard: D1-D6 top + D7-D12 bottom touching back-to-back)
  for (let i = 0; i < 6; i++) {
    units.push(
      buildUnit({
        projectId,
        blockCode: `D${i + 1}`,
        blockGroup: 'Blok D',
        status: statusesD[i],
        x: 564 + i * 48,
        y: 424,
        width: 48,
        height: 58,
        frontSide: 'top',
        seed: 615 + i,
      })
    );
    units.push(
      buildUnit({
        projectId,
        blockCode: `D${7 + i}`,
        blockGroup: 'Blok D',
        status: statusesD[6 + i],
        x: 564 + i * 48,
        y: 482,
        width: 48,
        height: 58,
        frontSide: 'bottom',
        seed: 625 + i,
      })
    );
  }

  return {
    id: projectId,
    shortName: 'Paal Merah',
    name: 'LIP Residence 4 — Paal Merah',
    areaLabel: 'Paal Merah, Jambi Selatan',
    blocksSummary: 'Blok A (16), Blok B (16), Blok C (12), Blok D (12)',
    viewBox: { width: 1120, height: 680 },
    roads: [
      {
        id: 'pm-rd-main-bvd',
        x: 204,
        y: 268,
        width: 682,
        height: 56,
        isMain: true,
        label: 'BOULEVARD UTAMA  ROW 12',
        labelX: 392,
        labelY: 299,
      },
      {
        id: 'pm-rd-a1',
        x: 344,
        y: 120,
        width: 30,
        height: 148,
        label: 'ROW 6',
        labelX: 359,
        labelY: 194,
        labelRotate: -90,
      },
      {
        id: 'pm-rd-ab',
        x: 474,
        y: 80,
        width: 32,
        height: 188,
        label: 'ROW 6',
        labelX: 490,
        labelY: 182,
        labelRotate: -90,
      },
      {
        id: 'pm-rd-b1',
        x: 610,
        y: 80,
        width: 30,
        height: 188,
        label: 'ROW 6',
        labelX: 625,
        labelY: 182,
        labelRotate: -90,
      },
      {
        id: 'pm-rd-east-n',
        x: 744,
        y: 100,
        width: 28,
        height: 168,
        label: 'ROW 6',
        labelX: 758,
        labelY: 184,
        labelRotate: -90,
      },
      {
        id: 'pm-rd-south-spine',
        x: 526,
        y: 324,
        width: 34,
        height: 252,
        isMain: true,
        label: 'ROW 8',
        labelX: 543,
        labelY: 452,
        labelRotate: -90,
      },
      {
        id: 'pm-rd-d-top',
        x: 560,
        y: 398,
        width: 296,
        height: 26,
        label: 'ROW 6',
        labelX: 710,
        labelY: 414,
      },
      {
        id: 'pm-rd-south-bot',
        x: 418,
        y: 546,
        width: 440,
        height: 26,
        label: 'ROW 6',
        labelX: 690,
        labelY: 562,
      },
    ],
    facilities: [
      {
        id: 'pm-fac-hall',
        kind: 'hall',
        label: 'Balai Warga & PAUD',
        sublabel: 'Fasilitas Sosial',
        x: 778,
        y: 120,
        width: 98,
        height: 138,
      },
      {
        id: 'pm-fac-park-sw',
        kind: 'park',
        label: 'Taman & RTH',
        sublabel: 'Area Bermain',
        x: 286,
        y: 334,
        width: 118,
        height: 92,
      },
    ],
    blockBanners: [
      { id: 'pm-bn-a', label: 'BLOK A', x: 246, y: 113 },
      { id: 'pm-bn-b', label: 'BLOK B', x: 508, y: 74 },
      { id: 'pm-bn-c', label: 'BLOK C', x: 424, y: 328 },
      { id: 'pm-bn-d', label: 'BLOK D', x: 566, y: 420 },
    ],
    decoration: {
      siteRotation: { angleDeg: 4, cx: 560, cy: 335, offsetX: 6, offsetY: 4 },
      boundaryPath:
        'M 232 108 L 486 112 L 494 68 L 764 72 L 896 118 L 866 576 L 408 576 L 352 444 L 222 426 L 226 268 Z',
      redBoundaryPath:
        'M 232 108 L 486 112 L 494 68 L 764 72 L 896 118 L 866 576 L 408 576 L 352 444 L 222 426 L 226 268 Z',
      roadPaths: [
        {
          id: 'pm-west-entry',
          d: 'M 176 276 L 236 276 L 236 316 L 176 316 Z',
          fill: '#E5E9F0',
          stroke: '#475569',
          strokeWidth: 1.2,
          label: 'IN / OUT',
          labelX: 204,
          labelY: 300,
        },
      ],
      greenZones: [
        {
          id: 'pm-gz-masjid',
          d: 'M 568 332 L 642 332 L 642 392 L 568 392 Z',
          kind: 'masjid-plaza',
          label: 'MASJID',
          labelX: 605,
          labelY: 366,
        },
        {
          id: 'pm-gz-se-rth',
          points: '652,332 852,332 852,392 652,392',
          kind: 'rth',
          label: 'TAMAN & RTH TIMUR',
          labelX: 752,
          labelY: 366,
        },
        {
          id: 'pm-gz-sw-slope',
          points: '364,438 412,438 412,562 394,562',
          kind: 'rth',
        },
      ],
      centerLines: [
        { x1: 278, y1: 296, x2: 548, y2: 296 },
        { x1: 656, y1: 296, x2: 874, y2: 296 },
        { x1: 543, y1: 332, x2: 543, y2: 540 },
      ],
      roundabouts: [
        {
          cx: 244,
          cy: 296,
          outerR: 25,
          innerR: 13,
          plazaFill: '#C57F80',
          label: 'GATE',
        },
        {
          cx: 602,
          cy: 296,
          outerR: 38,
          innerR: 22,
          rxOuter: 48,
          ryOuter: 27,
          rxInner: 30,
          ryInner: 15,
          plazaFill: '#C98788',
          label: 'BUNDARAN',
        },
      ],
      sheetTitle: 'LIP RESIDENCE 4 — PAAL MERAH',
      sheetSubtitle: 'PAAL MERAH, JAMBI SELATAN · 56 KAVLING',
      sheetTitlePos: { x: 46, y: 58, align: 'start' },
      scaleStampPos: { x: 54, y: 616 },
      compassVariant: 'classic-circle',
      compassPos: { x: 1018, y: 576 },
    },
    units,
  };
}

function buildInitialActivityLog(): ActivityLogEntry[] {
  return [
    {
      id: 'log-seed-1',
      projectId: 'lip-residence-1-mendalo',
      projectName: 'LIP Residence 1 — Mendalo',
      unitId: 'lip-residence-1-mendalo-a31',
      blockCode: 'A31',
      previousStatus: 'minat',
      newStatus: 'booking',
      note: 'Unit terlock — booking resmi masuk, proses berkas KTP/KK',
      updatedBy: 'Rina Marlina',
      timestamp: makeTimestamp(0.4, 0),
    },
    {
      id: 'log-seed-2',
      projectId: 'lip-residence-2-mayang',
      projectName: 'LIP Residence 2 — Mayang',
      unitId: 'lip-residence-2-mayang-c12',
      blockCode: 'C12',
      previousStatus: 'booking',
      newStatus: 'sp3k',
      note: 'SP3K BTN disetujui, penjadwalan akad bulan ini',
      updatedBy: 'Dedi Saputra',
      timestamp: makeTimestamp(0.9, 0),
    },
    {
      id: 'log-seed-3',
      projectId: 'lip-residence-1-mendalo',
      projectName: 'LIP Residence 1 — Mendalo',
      unitId: 'lip-residence-1-mendalo-b1',
      blockCode: 'B1',
      previousStatus: 'reject',
      newStatus: 'open',
      note: 'Posisi strategis dekat Gerbang & Taman Median, siap survei',
      updatedBy: 'Siti Rahma',
      timestamp: makeTimestamp(1.2, 0),
    },
    {
      id: 'log-seed-4',
      projectId: 'lip-residence-3-kenali',
      projectName: 'LIP Residence 3 — Kenali',
      unitId: 'lip-residence-3-kenali-b10',
      blockCode: 'B10',
      previousStatus: 'booking',
      newStatus: 'cash',
      note: 'Pembelian cash keras lunas, serah terima kunci terjadwal',
      updatedBy: 'Rina Marlina',
      timestamp: makeTimestamp(3.5, 12),
    },
    {
      id: 'log-seed-5',
      projectId: 'lip-residence-4-paal-merah',
      projectName: 'LIP Residence 4 — Paal Merah',
      unitId: 'lip-residence-4-paal-merah-b4',
      blockCode: 'B4',
      previousStatus: 'open',
      newStatus: 'booking',
      note: 'Unit terlock — booking resmi tercatat, melengkapi berkas',
      updatedBy: 'Dedi Saputra',
      timestamp: makeTimestamp(5.1, 20),
    },
  ];
}

export function createSeedState(): SiteplanStoreState {
  return {
    projects: [
      buildMendaloProject(),
      buildMayangProject(),
      buildKenaliProject(),
      buildPaalMerahProject(),
    ],
    activityLog: buildInitialActivityLog(),
  };
}
