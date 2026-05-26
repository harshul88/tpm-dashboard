import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { success, fail } from '../shared/response';
import { TpmError } from '../shared/errors';
import { getConfig } from '../shared/config';
import type { Program } from '../shared/models';
import { MOCK_PROGRAMS } from '../shared/models';

const MOCK_PATH = process.env.MOCK_DATA_PATH ?? join(process.cwd(), 'src/data');
const TABLE     = process.env.PROGRAMS_TABLE_NAME ?? 'tpm-dashboard-programs';
const dynamo    = DynamoDBDocumentClient.from(new DynamoDBClient({}));

type Audience   = 'exec' | 'eng_lead' | 'tpm' | 'stakeholder';
type Tone       = 'formal' | 'casual';
type Confidence = 'high' | 'medium' | 'low';

interface GenerateReportBody {
  week_ending?: string;
  audience?:    Audience;
  include?:     string[];
  tone?:        Tone;
}

// --- Raw data shapes ---
interface RawTicket {
  id: string; title: string; status: string; blocked: boolean;
  assignee: string; storyPoints: number; sprint: string;
}
interface RawSprint {
  id: string; name: string; startDate: string; endDate: string;
  committedPoints: number; completedPoints: number; isActive: boolean;
}
interface RawDeployment {
  date: string; deploys_count: number; failed_count: number;
}
interface RawInitiative {
  id: string; name: string; team: string; end_date: string;
  status: string; pct_complete: number;
}
interface RawRisk {
  id: string; title: string; severity: string;
  mitigation?: string | null;
}

// --- Helpers ---
function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(MOCK_PATH, file), 'utf-8')) as T;
}

function fileAgeDays(file: string): number {
  try {
    const mtime = statSync(join(MOCK_PATH, file)).mtime;
    return (Date.now() - mtime.getTime()) / 86_400_000;
  } catch {
    return 999; // if stat fails, treat as stale
  }
}

function dataConfidence(files: string[]): Confidence {
  const maxAge = Math.max(...files.map(fileAgeDays));
  if (maxAge > 7) return 'low';
  if (maxAge > 3) return 'medium';
  return 'high';
}

const AUDIENCE_INSTRUCTIONS: Record<Audience, string> = {
  exec: `Focus on: overall RAG status, business impact, strategic risks, and resource asks.
Do NOT include DORA metrics or code-level technical details.
Keep language non-technical — CEO / board level.`,
  eng_lead: `Focus on: DORA metrics (deployment frequency, lead time, MTTR, CFR with tier ratings),
technical blockers with specific ticket IDs, team velocity, and code quality signals.
Include full technical detail.`,
  tpm: `Include everything: sprint velocity, DORA metrics, initiative health, risk register,
upcoming milestones, team capacity. Maximum detail for program management.`,
  stakeholder: `Focus on: milestone delivery status, overall program health, and business risks.
Do NOT include DORA metrics, ticket IDs, or technical implementation details.`,
};

function buildPrompt(
  program: Program,
  weekEnding: string,
  audience: Audience,
  tone: Tone,
  include: string[],
  context: {
    sprint: RawSprint;
    tickets: RawTicket[];
    deployFreqPerDay: number;
    cfrPct: number;
    atRiskInitiatives: RawInitiative[];
    openHighRisks: RawRisk[];
    upcomingMilestones: RawInitiative[];
  },
): string {
  const {
    sprint, tickets, deployFreqPerDay, cfrPct,
    atRiskInitiatives, openHighRisks, upcomingMilestones,
  } = context;

  const committed  = sprint.committedPoints;
  const completed  = sprint.completedPoints;
  const completion = committed > 0 ? Math.round((completed / committed) * 100) : 0;
  const blockers   = tickets.filter((t) => t.blocked);
  const toneNote   = tone === 'casual' ? 'Use a friendly, conversational tone.' : 'Use a professional, formal tone.';

  const includeNote = include.length
    ? `Only generate content for these sections: ${include.join(', ')}.`
    : 'Generate all sections.';

  return `Program: ${program.name} (${program.type})
Week ending: ${weekEnding}
Audience: ${audience}
${AUDIENCE_INSTRUCTIONS[audience]}
Tone: ${toneNote}
${includeNote}

SPRINT DATA (${sprint.name}):
  Committed: ${committed} points | Completed: ${completed} points | Completion: ${completion}%
  Blockers (${blockers.length}): ${blockers.map((t) => `${t.id} "${t.title}" (${t.assignee})`).join('; ') || 'none'}

DORA METRICS (last 30 days):
  Deployment frequency: ${deployFreqPerDay.toFixed(2)}/day ${deployFreqPerDay > 1 ? '(Elite)' : deployFreqPerDay > 1 / 7 ? '(High)' : '(Medium)'}
  Change failure rate: ${cfrPct.toFixed(1)}% ${cfrPct <= 5 ? '(Elite)' : cfrPct <= 10 ? '(High)' : '(Medium/Low)'}

INITIATIVES AT RISK (${atRiskInitiatives.length}):
${atRiskInitiatives.map((i) => `  - ${i.name} [${i.team}] — ${i.status} — ${i.pct_complete}% complete`).join('\n') || '  None'}

OPEN HIGH RISKS WITHOUT MITIGATION (${openHighRisks.length}):
${openHighRisks.map((r) => `  - ${r.id}: ${r.title}`).join('\n') || '  None'}

UPCOMING MILESTONES (next 14 days, ${upcomingMilestones.length}):
${upcomingMilestones.map((i) => `  - ${i.name} due ${i.end_date} [${i.team}]`).join('\n') || '  None'}

Return a JSON object with exactly these fields:
{
  "rag_status": "green" | "amber" | "red",
  "executive_summary": "string (2-3 sentences max)",
  "accomplishments": ["string (past tense bullet)"],
  "blockers": [{"title": "string", "owner": "string", "escalation_needed": boolean}],
  "risks": [{"title": "string", "severity": "string", "mitigation": "string | null"}],
  "upcoming_milestones": [{"title": "string", "date": "string", "owner": "string"}],
  "recommended_actions": ["string (specific, actionable)"],
  "data_notes": "string | null"
}
Return only valid JSON — no markdown, no code blocks, no preamble.`;
}

async function callClaude(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string,
  model: string,
): Promise<string> {
  const msg = await client.messages.create({
    model,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  return msg.content[0].type === 'text' ? msg.content[0].text : '';
}

interface ClaudeReport {
  rag_status:           'green' | 'amber' | 'red';
  executive_summary:    string;
  accomplishments:      string[];
  blockers:             { title: string; owner: string; escalation_needed: boolean }[];
  risks:                { title: string; severity: string; mitigation: string | null }[];
  upcoming_milestones:  { title: string; date: string; owner: string }[];
  recommended_actions:  string[];
  data_notes:           string | null;
}

// Bypasses cache intentionally — every call costs API tokens and is user-triggered.
export async function generateReport(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const config = getConfig();
  if (!config.ai.report_generation) {
    return fail(TpmError.notImplemented('AI report generation (disabled in tpm.config.json)'));
  }

  let body: GenerateReportBody = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body) as GenerateReportBody;
    } catch {
      return fail(TpmError.invalidParams('Invalid JSON body'));
    }
  }

  const weekEnding = body.week_ending ?? new Date().toISOString().split('T')[0];
  const audience   = body.audience   ?? 'tpm';
  const tone       = body.tone       ?? 'formal';
  const include    = body.include    ?? [];

  // Step 1 — Resolve program
  let program: Program | undefined;
  try {
    const result = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { id: programId } }));
    program = result.Item as Program | undefined;
  } catch { /* fall through to mock */ }
  if (!program) program = MOCK_PROGRAMS.find((p) => p.id === programId);
  if (!program) return fail(TpmError.programNotFound(programId));

  // Step 2 — Collect mock data
  const dataFiles = ['sprints.json', 'tickets.json', 'deployments.json', 'initiatives.json', 'risks.json'];
  const confidence = dataConfidence(dataFiles);

  const allSprints     = readJson<RawSprint[]>('sprints.json');
  const allTickets     = readJson<RawTicket[]>('tickets.json');
  const allDeployments = readJson<RawDeployment[]>('deployments.json');
  const allInitiatives = readJson<RawInitiative[]>('initiatives.json');
  const allRisks       = readJson<RawRisk[]>('risks.json');

  const activeSprint = allSprints.find((s) => s.isActive) ?? allSprints[allSprints.length - 1];
  const sprintTickets = allTickets.filter((t) => t.sprint === activeSprint.name);

  const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
  const recentDeploys = allDeployments.filter((d) => new Date(d.date).getTime() >= thirtyDaysAgo);
  const totalDeploys  = recentDeploys.reduce((s, d) => s + d.deploys_count, 0);
  const totalFailed   = recentDeploys.reduce((s, d) => s + d.failed_count, 0);
  const deployFreqPerDay = totalDeploys / 30;
  const cfrPct = totalDeploys > 0 ? (totalFailed / totalDeploys) * 100 : 0;

  const atRiskInitiatives = allInitiatives.filter(
    (i) => i.status === 'At risk' || i.status === 'Off track',
  );
  const openHighRisks = allRisks.filter(
    (r) => r.severity === 'HIGH' && !r.mitigation,
  );
  const fourteenDaysFromNow = Date.now() + 14 * 86_400_000;
  const upcomingMilestones = allInitiatives.filter((i) => {
    const end = new Date(i.end_date).getTime();
    return end >= Date.now() && end <= fourteenDaysFromNow;
  });

  // Step 3 & 4 — Build prompt and call Claude
  const systemPrompt = `You are an expert Technical Program Manager writing a weekly status report. \
You write clearly, concisely, and with appropriate urgency. \
You surface risks early and recommend specific actions. \
You adapt your tone and detail level to your audience.`;

  const userPrompt = buildPrompt(program, weekEnding, audience, tone, include, {
    sprint: activeSprint,
    tickets: sprintTickets,
    deployFreqPerDay,
    cfrPct,
    atRiskInitiatives,
    openHighRisks,
    upcomingMilestones,
  });

  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
  const client = new Anthropic();

  let parsed: ClaudeReport;
  try {
    const text = await callClaude(client, systemPrompt, userPrompt, model);
    try {
      parsed = JSON.parse(text) as ClaudeReport;
    } catch {
      // Retry once with explicit JSON reminder
      const retryPrompt = `${userPrompt}\n\nIMPORTANT: Your previous response was not valid JSON. \
Return ONLY a valid JSON object. No markdown, no code blocks, no explanation before or after.`;
      const retryText = await callClaude(client, systemPrompt, retryPrompt, model);
      parsed = JSON.parse(retryText) as ClaudeReport;
    }
  } catch {
    return fail(TpmError.aiGenerationFailed());
  }

  // Step 5 — Store draft with 24-hour TTL
  const now       = new Date();
  const draftId   = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + config.defaults.report_draft_expiry_hours * 3_600_000);
  const ttl       = Math.floor(expiresAt.getTime() / 1000); // DynamoDB TTL (seconds)

  await dynamo.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        id:          draftId,
        type:        'report_draft',
        program_id:  programId,
        report:      parsed,
        audience,
        tone,
        week_ending: weekEnding,
        confidence,
        created_at:  now.toISOString(),
        expires_at:  expiresAt.toISOString(),
        ttl,
      },
    }),
  );

  // Step 6 — Return draft (never cached)
  return success(
    {
      draft_id:   draftId,
      status:     'draft',
      expires_at: expiresAt.toISOString(),
      confidence,
      report:     parsed,
    },
    'mock',
  );
}
