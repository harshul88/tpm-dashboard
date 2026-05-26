import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success } from '../shared/response';
import { getConfig as readConfig } from '../shared/config';
import type { TpmConfig } from '../shared/config';

export async function getConfig(
  _event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const config = readConfig();

  // List only which integrations are enabled — never expose credentials,
  // database IDs, API keys, org names, or repo identifiers.
  const integrationsEnabled = (
    Object.entries(config.integrations) as [
      keyof TpmConfig['integrations'],
      { enabled: boolean },
    ][]
  )
    .filter(([, v]) => v.enabled)
    .map(([k]) => k);

  const data = {
    project:              config.project,
    version:              config.version,
    sources: {
      sprintTracker: config.defaults.dataSources.sprintTracker,
      engMetrics:    config.defaults.dataSources.engMetrics,
      roadmap:       config.defaults.dataSources.roadmap,
    },
    integrations_enabled: integrationsEnabled,
    hosting:              config.hosting,
    infrastructure:       config.infrastructure,
    ai_enabled:           config.ai.report_generation,
  };

  return success(data, 'system');
}
