export interface Sede {
  id: number;
  name: string;
  manipuladoraName: string;
  isActive: boolean;
  code?: string;
}

export type SyncStatus = 'SYNCED' | 'PENDING';

export type FilterType = 'magic_color' | 'bw_sharp' | 'grayscale' | 'original' | 'camscanner';

export interface RationsBreakdown {
  desayunos?: number;
  almuerzos?: number;
  refrigerios?: number;
  faltantes?: number;
}

export interface AuditDetails {
  hasInstitutionalSeal: boolean;
  hasSignatures: boolean;
  isAuthenticPAE: boolean;
  verifiedAt?: string;
}

export interface Report {
  id: number;
  sedeId: number;
  sedeName: string;
  manipuladoraName: string;
  notes: string;
  rations?: RationsBreakdown;
  filterApplied: FilterType | string;
  photoBase64: string | null;
  syncStatus: SyncStatus;
  createdAt: number;
  syncedAt?: number | null;
  transcriptionByAI?: boolean;
  auditDetails?: AuditDetails;
  aiModel?: string;
}

export interface AppConfig {
  adminPin: string;
  appName: string;
  lastSyncTimestamp?: number;
}

export interface DatabaseSchema {
  config: AppConfig;
  sedes: Sede[];
  reports: Report[];
}
