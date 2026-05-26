import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, fail } from '../shared/response';
import { TpmError } from '../shared/errors';
import { health } from './health';
import { getConfig } from './getConfig';
import { invalidateCache } from './invalidateCache';
import { getConfig as readConfig } from '../shared/config';
import { invalidate } from '../shared/cache';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const { httpMethod } = event;
  const programId = event.pathParameters?.programId ?? null;
  const resource  = event.resource ?? event.path;

  try {
    // ── Top-level routes (no programId) ───────────────────────────────────
    if (httpMethod === 'GET'  && resource.endsWith('/health')) {
      return await health();
    }

    if (httpMethod === 'GET'  && resource.endsWith('/config') && !programId) {
      return await getConfig(event);
    }

    if (httpMethod === 'POST' && resource.endsWith('/invalidate') && !programId) {
      return await invalidateCache(event);
    }

    // ── Program-scoped routes (programId required) ────────────────────────
    if (!programId) {
      return fail(TpmError.invalidParams(`No route: ${httpMethod} ${event.path}`));
    }

    // GET /programs/:id/system/config — resolved sources, no credentials
    if (httpMethod === 'GET' && resource.endsWith('/config')) {
      const config = readConfig();
      return success({
        programId,
        dataMode: 'mock',
        sources: {
          sprint: {
            provider:  config.integrations.jira.enabled   ? 'jira'
                     : config.integrations.github.enabled ? 'github'
                     : 'mock',
            connected: config.integrations.jira.enabled || config.integrations.github.enabled,
            lastSync:  null,
          },
          metrics: {
            provider:  config.integrations.github.enabled ? 'github' : 'mock',
            connected: config.integrations.github.enabled,
            lastSync:  null,
          },
          roadmap: {
            provider:  config.integrations.notion.enabled       ? 'notion'
                     : config.integrations.googleSheets.enabled ? 'google-sheets'
                     : 'mock',
            connected: config.integrations.notion.enabled || config.integrations.googleSheets.enabled,
            lastSync:  null,
          },
        },
      }, 'system');
    }

    // POST /programs/:id/system/cache/invalidate — bust all keys for this program
    if (httpMethod === 'POST' && resource.endsWith('/invalidate')) {
      const keysCleared = await invalidate(programId);
      return success(
        { programId, invalidatedAt: new Date().toISOString(), keysCleared },
        'system',
      );
    }

    return fail(TpmError.invalidParams(`No route: ${httpMethod} ${event.path}`));
  } catch (e) {
    if (e instanceof TpmError) return fail(e);
    if (e instanceof Error)    return fail(TpmError.internal(e.message));
    return fail(TpmError.internal('Unknown error'));
  }
};
