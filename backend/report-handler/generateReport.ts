import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Anthropic from '@anthropic-ai/sdk';
import { ok, err } from '../shared/response';
import { ErrorCode } from '../shared/errors';
import { getConfig } from '../shared/config';
import crypto from 'node:crypto';

interface GenerateReportBody {
  weekEndingDate?: string;
  tone?: 'executive' | 'detailed';
  includeConfidential?: boolean;
}

// generateReport intentionally bypasses cache — every call costs tokens and is
// explicitly triggered by the TPM. See API_CONTRACT.md §Design Principles #6.
export async function generateReport(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const config = getConfig();

  if (!config.ai.report_generation) {
    return err(ErrorCode.NOT_IMPLEMENTED, 'AI report generation is disabled in tpm.config.json', programId);
  }

  let body: GenerateReportBody = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body) as GenerateReportBody;
    } catch {
      return err(ErrorCode.INVALID_PARAMS, 'Invalid JSON body', programId);
    }
  }

  const weekEnding = body.weekEndingDate ?? new Date().toISOString();
  const tone = body.tone ?? 'executive';

  // TODO: gather live program data (sprint, dora, roadmap, risks) before calling Claude
  const programContext = `
Program ID: ${programId}
Week ending: ${weekEnding}
Tone: ${tone}
Sprint status: On track — 60% complete, 2 blockers
DORA: Deployment frequency 4.2/week (High), MTTR 1.4h (Elite)
Roadmap: 1 of 4 initiatives at-risk
Open risks: 1 (CloudFront activation delay — mitigating)
  `.trim();

  let ragStatus: 'red' | 'amber' | 'green' = 'green';
  let executiveSummary = '';

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: config.ai.model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a Technical Program Manager writing a weekly status report.
Write a concise executive summary (3-4 sentences) and determine RAG status (red/amber/green).
Return JSON only with keys: ragStatus, executiveSummary.

Program data:
${programContext}`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = JSON.parse(text) as { ragStatus: 'red' | 'amber' | 'green'; executiveSummary: string };
    ragStatus = parsed.ragStatus;
    executiveSummary = parsed.executiveSummary;
  } catch {
    return err(ErrorCode.AI_GENERATION_FAILED, 'Claude failed to generate the status report', programId);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.defaults.report_draft_expiry_hours * 3_600_000);

  const draft = {
    report_id: `temp_${crypto.randomUUID()}`,
    status: 'draft',
    expires_at: expiresAt.toISOString(),
    generatedAt: now.toISOString(),
    weekEnding,
    ragStatus,
    executiveSummary,
    keyAccomplishments: [],
    blockersNeedingEscalation: [],
    riskSummary: [],
    upcomingMilestones: [],
    exportFormats: { markdown: executiveSummary, pdfUrl: null },
  };

  // Store draft in DynamoDB temp store with TTL matching expires_at
  // TODO: cachePut(`draft:${draft.report_id}`, draft) with custom TTL

  return ok(draft, { programId, source: 'live' });
}
