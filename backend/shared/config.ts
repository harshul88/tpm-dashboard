import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Source } from './errors';

export interface TpmConfig {
  project: string;
  version: string;
  description: string;
  programs: unknown[];
  defaults: {
    dataSources: { sprintTracker: string; engMetrics: string; roadmap: string };
    cache_ttl_minutes: number;
    report_draft_expiry_hours: number;
    data_staleness_warning_days: number;
  };
  integrations: {
    github:       { enabled: boolean; org: string; repo: string };
    notion:       { enabled: boolean; databaseId: string };
    jira:         { enabled: boolean; domain: string; projectKey: string };
    googleSheets: { enabled: boolean; spreadsheetId: string };
    pagerduty:    { enabled: boolean };
  };
  hosting: string;
  infrastructure: string;
  environments: {
    staging: { url: string; bucket: string };
    prod:    { url: string; bucket: string };
  };
  ai: {
    provider: string;
    model: string;
    report_generation: boolean;
    confidence_thresholds: { high: number; medium: number; low: number };
  };
}

const FALLBACK: TpmConfig = {
  project: 'TPM OS',
  version: '1.0.0',
  description: 'TPM Dashboard (mock fallback — tpm.config.json not found)',
  programs: [],
  defaults: {
    dataSources: { sprintTracker: 'mock', engMetrics: 'mock', roadmap: 'mock' },
    cache_ttl_minutes: 5,
    report_draft_expiry_hours: 24,
    data_staleness_warning_days: 7,
  },
  integrations: {
    github:       { enabled: false, org: '', repo: '' },
    notion:       { enabled: false, databaseId: '' },
    jira:         { enabled: false, domain: '', projectKey: '' },
    googleSheets: { enabled: false, spreadsheetId: '' },
    pagerduty:    { enabled: false },
  },
  hosting: 'aws',
  infrastructure: 'cdk',
  environments: {
    staging: { url: '', bucket: 'tpm-dashboard-staging' },
    prod:    { url: '', bucket: 'tpm-dashboard-prod' },
  },
  ai: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    report_generation: false,
    confidence_thresholds: { high: 1, medium: 3, low: 7 },
  },
};

let _config: TpmConfig | null = null;

export function getConfig(): TpmConfig {
  if (_config) return _config;
  const path = process.env.CONFIG_PATH ?? join(process.cwd(), 'tpm.config.json');
  try {
    _config = JSON.parse(readFileSync(path, 'utf-8')) as TpmConfig;
  } catch {
    _config = FALLBACK;
  }
  return _config;
}

type Dashboard = 'sprintTracker' | 'engMetrics' | 'roadmap';

export function getDataSource(dashboard: Dashboard): Source {
  return getConfig().defaults.dataSources[dashboard] as Source;
}

export function isIntegrationEnabled(
  name: keyof TpmConfig['integrations'],
): boolean {
  return getConfig().integrations[name].enabled;
}

export function getAiConfig(): TpmConfig['ai'] {
  return getConfig().ai;
}

export function getCacheTtl(): number {
  return getConfig().defaults.cache_ttl_minutes;
}
