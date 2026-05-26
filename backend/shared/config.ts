import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface DataSources {
  sprintTracker: string;
  engMetrics: string;
  roadmap: string;
}

export interface TpmConfig {
  project: string;
  version: string;
  description: string;
  programs: unknown[];
  defaults: {
    dataSources: DataSources;
    cache_ttl_minutes: number;
    report_draft_expiry_hours: number;
    data_staleness_warning_days: number;
  };
  integrations: {
    github: { enabled: boolean; org: string; repo: string };
    notion: { enabled: boolean; databaseId: string };
    jira: { enabled: boolean; domain: string; projectKey: string };
    googleSheets: { enabled: boolean; spreadsheetId: string };
    pagerduty: { enabled: boolean };
  };
  hosting: string;
  infrastructure: string;
  environments: {
    staging: { url: string; bucket: string };
    prod: { url: string; bucket: string };
  };
  ai: {
    provider: string;
    model: string;
    report_generation: boolean;
    confidence_thresholds: { high: number; medium: number; low: number };
  };
}

let _config: TpmConfig | null = null;

export function getConfig(): TpmConfig {
  if (_config) return _config;
  const path = process.env.CONFIG_PATH ?? join(process.cwd(), 'tpm.config.json');
  _config = JSON.parse(readFileSync(path, 'utf-8')) as TpmConfig;
  return _config;
}
