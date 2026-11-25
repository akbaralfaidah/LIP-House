import type { KavlingStatus, UserRole } from '../types/siteplan';

export interface StatusMeta {
  key: KavlingStatus;
  label: string;
  shortLabel: string;
  subLabel?: string;
  color: string;
  darkStroke: string;
  softBg: string;
  softBorder: string;
  softText: string;
  plotTextColor: string;
  description: string;
  lockBadge: string;
  marketingHint: string;
  isDashed?: boolean;
  isLocked?: boolean;
}

export const STATUS_ORDER: KavlingStatus[] = [
  'open',
  'minat',
  'booking',
  'sp3k',
  'akad',
  'cash',
  'reject',
];

/**
 * 7 Official LIP House statuses (Client revision: Minat = Belum Lock, Booking = Terlock,
 * Akad & Cash separated) in muted architectural CAD poster tones.
 */
export const STATUS_CONFIG: Record<KavlingStatus, StatusMeta> = {
  open: {
    key: 'open',
    label: 'Open',
    shortLabel: 'Open',
    color: '#4E8C5F',
    darkStroke: '#356643',
    softBg: '#F1F7F3',
    softBorder: '#C6DFCD',
    softText: '#2F623E',
    plotTextColor: '#FFFFFF',
    description: 'Unit tersedia dan siap dipasarkan.',
    lockBadge: 'Unit Tersedia',
    marketingHint: 'Unit tersedia penuh — bisa langsung ditawarkan & survei konsumen.',
    isLocked: false,
  },
  minat: {
    key: 'minat',
    label: 'Minat',
    shortLabel: 'Minat',
    subLabel: 'Belum Lock',
    color: '#D6AE48',
    darkStroke: '#856314',
    softBg: '#FBF7EA',
    softBorder: '#EADBA8',
    softText: '#7D6018',
    plotTextColor: '#292007',
    description: 'Belum terkunci — calon konsumen berminat / penjajakan.',
    lockBadge: 'Belum Lock',
    marketingHint: 'Unit masih BELUM LOCK (tahap minat). Masih bisa ditawarkan — konfirmasi admin.',
    isDashed: true,
    isLocked: false,
  },
  booking: {
    key: 'booking',
    label: 'Booking',
    shortLabel: 'Booking',
    subLabel: 'Terlock',
    color: '#CC733C',
    darkStroke: '#83411B',
    softBg: '#FCF3EC',
    softBorder: '#EBC8B1',
    softText: '#9A4C1F',
    plotTextColor: '#FFFFFF',
    description: 'Unit sudah terlock (booking resmi).',
    lockBadge: 'Terlock (Booking)',
    marketingHint: 'Unit sudah TERLOCK melalui booking resmi. Arahkan konsumen ke unit Open / Minat.',
    isDashed: false,
    isLocked: true,
  },
  sp3k: {
    key: 'sp3k',
    label: 'SP3K',
    shortLabel: 'SP3K',
    subLabel: 'Terlock Bank',
    color: '#30548E',
    darkStroke: '#1D3761',
    softBg: '#EFF3FA',
    softBorder: '#C1D1EA',
    softText: '#224070',
    plotTextColor: '#FFFFFF',
    description: 'Unit terlock — pengajuan KPR & berkas disetujui bank.',
    lockBadge: 'Terlock (SP3K Bank)',
    marketingHint: 'Unit sudah TERLOCK resmi SP3K bank. Arahkan konsumen ke kavling Open.',
    isLocked: true,
  },
  akad: {
    key: 'akad',
    label: 'Akad',
    shortLabel: 'Akad',
    color: '#6E518A',
    darkStroke: '#4B3463',
    softBg: '#F4F1F8',
    softBorder: '#D5C7E3',
    softText: '#533A6D',
    plotTextColor: '#FFFFFF',
    description: 'Terjual / closing final melalui Akad Kredit (KPR).',
    lockBadge: 'Terjual — Akad KPR',
    marketingHint: 'Unit sudah terjual (Akad KPR). Tidak tersedia untuk pemasaran.',
    isLocked: true,
  },
  cash: {
    key: 'cash',
    label: 'Cash',
    shortLabel: 'Cash',
    color: '#2A7E86',
    darkStroke: '#1A5459',
    softBg: '#EDF7F8',
    softBorder: '#B7DCE0',
    softText: '#1D5E64',
    plotTextColor: '#FFFFFF',
    description: 'Terjual / closing final melalui Pembelian Cash.',
    lockBadge: 'Terjual — Cash',
    marketingHint: 'Unit sudah terjual (Cash). Tidak tersedia untuk pemasaran.',
    isLocked: true,
  },
  reject: {
    key: 'reject',
    label: 'Reject',
    shortLabel: 'Reject',
    color: '#B94B50',
    darkStroke: '#7F2E32',
    softBg: '#FAF1F1',
    softBorder: '#E7C1C3',
    softText: '#8E3338',
    plotTextColor: '#FFFFFF',
    description: 'Pengajuan / berkas ditolak bank.',
    lockBadge: 'Berkas Ditolak (Reject)',
    marketingHint: 'Pengajuan sebelumnya ditolak — tunggu konfirmasi admin untuk pembukaan kembali.',
    isLocked: false,
  },
};

export interface RoleMeta {
  key: UserRole;
  label: string;
  shortLabel: string;
  subtitle: string;
  badgeColor: string;
  canEdit: boolean;
  canViewActivityLog: boolean;
  canViewInternalNotes: boolean;
}

export const ROLE_CONFIG: Record<UserRole, RoleMeta> = {
  admin: {
    key: 'admin',
    label: 'Admin',
    shortLabel: 'Admin',
    subtitle: 'Update Siteplan',
    badgeColor: '#30548E',
    canEdit: true,
    canViewActivityLog: true,
    canViewInternalNotes: true,
  },
  pimpinan: {
    key: 'pimpinan',
    label: 'Pimpinan / Kepala Penjualan',
    shortLabel: 'Pimpinan',
    subtitle: 'Live Monitoring',
    badgeColor: '#6E518A',
    canEdit: false,
    canViewActivityLog: true,
    canViewInternalNotes: true,
  },
  marketing: {
    key: 'marketing',
    label: 'Marketing Internal',
    shortLabel: 'Marketing',
    subtitle: 'Cek Lapangan',
    badgeColor: '#4E8C5F',
    canEdit: false,
    canViewActivityLog: false,
    canViewInternalNotes: false,
  },
};
