export type ProgramType   = 'product_dev' | 'compliance' | 'migration' | 'initiative';
export type ProgramStatus = 'green' | 'amber' | 'red';

export interface Dashboard {
  id:          'sprint' | 'metrics' | 'roadmap' | 'report';
  enabled:     boolean;
  data_source: string;
}

export interface Program {
  id:              string;
  name:            string;
  type:            ProgramType;
  description:     string;
  status:          ProgramStatus;
  status_override: ProgramStatus | null;
  dashboards:      Dashboard[];
  sharing: {
    enabled:       boolean;
    collaborators: string[];
  };
  data_sources: {
    sprint:  string;
    metrics: string;
    roadmap: string;
  };
  created_at: string;
  updated_at: string;
}

type ProgramTemplate = Omit<Program, 'id' | 'name' | 'created_at' | 'updated_at'>;

export const PROGRAM_TEMPLATES: Record<ProgramType, ProgramTemplate> = {
  product_dev: {
    type:            'product_dev',
    description:     'Track sprint progress, engineering metrics, and feature roadmap',
    status:          'green',
    status_override: null,
    dashboards: [
      { id: 'sprint',  enabled: true,  data_source: 'mock' },
      { id: 'metrics', enabled: true,  data_source: 'mock' },
      { id: 'roadmap', enabled: true,  data_source: 'mock' },
      { id: 'report',  enabled: true,  data_source: 'mock' },
    ],
    sharing:      { enabled: false, collaborators: [] },
    data_sources: { sprint: 'mock', metrics: 'mock', roadmap: 'mock' },
  },
  compliance: {
    type:            'compliance',
    description:     'Monitor compliance requirements, risk items, and audit readiness',
    status:          'green',
    status_override: null,
    dashboards: [
      { id: 'sprint',  enabled: false, data_source: 'mock' },
      { id: 'metrics', enabled: false, data_source: 'mock' },
      { id: 'roadmap', enabled: true,  data_source: 'mock' },
      { id: 'report',  enabled: true,  data_source: 'mock' },
    ],
    sharing:      { enabled: false, collaborators: [] },
    data_sources: { sprint: 'mock', metrics: 'mock', roadmap: 'mock' },
  },
  migration: {
    type:            'migration',
    description:     'Track platform migration milestones, blockers, and team velocity',
    status:          'green',
    status_override: null,
    dashboards: [
      { id: 'sprint',  enabled: true,  data_source: 'mock' },
      { id: 'metrics', enabled: false, data_source: 'mock' },
      { id: 'roadmap', enabled: true,  data_source: 'mock' },
      { id: 'report',  enabled: true,  data_source: 'mock' },
    ],
    sharing:      { enabled: false, collaborators: [] },
    data_sources: { sprint: 'mock', metrics: 'mock', roadmap: 'mock' },
  },
  initiative: {
    type:            'initiative',
    description:     'Track OKR progress, key results, and initiative health',
    status:          'green',
    status_override: null,
    dashboards: [
      { id: 'sprint',  enabled: false, data_source: 'mock' },
      { id: 'metrics', enabled: false, data_source: 'mock' },
      { id: 'roadmap', enabled: true,  data_source: 'mock' },
      { id: 'report',  enabled: true,  data_source: 'mock' },
    ],
    sharing:      { enabled: false, collaborators: [] },
    data_sources: { sprint: 'mock', metrics: 'mock', roadmap: 'mock' },
  },
};

const MOCK_BASE = '2025-01-01T00:00:00.000Z';

export const MOCK_PROGRAMS: Program[] = [
  {
    id:              'mock-program-1',
    name:            'Mobile App Rewrite',
    type:            'product_dev',
    description:     'Full rewrite of the iOS and Android apps to React Native',
    status:          'amber',
    status_override: null,
    dashboards: [
      { id: 'sprint',  enabled: true, data_source: 'mock' },
      { id: 'metrics', enabled: true, data_source: 'mock' },
      { id: 'roadmap', enabled: true, data_source: 'mock' },
      { id: 'report',  enabled: true, data_source: 'mock' },
    ],
    sharing:      { enabled: false, collaborators: [] },
    data_sources: { sprint: 'mock', metrics: 'mock', roadmap: 'mock' },
    created_at:   MOCK_BASE,
    updated_at:   MOCK_BASE,
  },
  {
    id:              'mock-program-2',
    name:            'SOC 2 Compliance',
    type:            'compliance',
    description:     'Achieve SOC 2 Type II certification by end of Q3',
    status:          'green',
    status_override: null,
    dashboards: [
      { id: 'sprint',  enabled: false, data_source: 'mock' },
      { id: 'metrics', enabled: false, data_source: 'mock' },
      { id: 'roadmap', enabled: true,  data_source: 'mock' },
      { id: 'report',  enabled: true,  data_source: 'mock' },
    ],
    sharing:      { enabled: false, collaborators: [] },
    data_sources: { sprint: 'mock', metrics: 'mock', roadmap: 'mock' },
    created_at:   MOCK_BASE,
    updated_at:   MOCK_BASE,
  },
  {
    id:              'mock-program-3',
    name:            'Platform Migration Q3',
    type:            'migration',
    description:     'Migrate legacy monolith to microservices on AWS EKS',
    status:          'red',
    status_override: null,
    dashboards: [
      { id: 'sprint',  enabled: true,  data_source: 'mock' },
      { id: 'metrics', enabled: false, data_source: 'mock' },
      { id: 'roadmap', enabled: true,  data_source: 'mock' },
      { id: 'report',  enabled: true,  data_source: 'mock' },
    ],
    sharing:      { enabled: false, collaborators: [] },
    data_sources: { sprint: 'mock', metrics: 'mock', roadmap: 'mock' },
    created_at:   MOCK_BASE,
    updated_at:   MOCK_BASE,
  },
];
