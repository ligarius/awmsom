export interface ComplianceSettings {
  retentionDays: number;
  lastUpdatedAt?: string;
  updatedBy?: string;
}

export interface PermissionReviewConfig {
  frequency: string;
  nextReviewDate?: string;
  notifyDaysBefore: number;
  lastRunAt?: string;
}
