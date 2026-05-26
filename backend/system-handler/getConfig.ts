import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success } from '../shared/response';
import { getConfig as readConfig } from '../shared/config';

export async function getConfig(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const config = readConfig();

  // Return resolved source config — never return credentials
  const data = {
    programId,
    dataMode: 'mock',
    sources: {
      sprint: {
        provider:  config.integrations.jira.enabled    ? 'jira'
                 : config.integrations.github.enabled  ? 'github'
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
      risks: {
        provider:  config.integrations.notion.enabled       ? 'notion'
                 : config.integrations.googleSheets.enabled ? 'google-sheets'
                 : 'mock',
        connected: config.integrations.notion.enabled || config.integrations.googleSheets.enabled,
        lastSync:  null,
      },
    },
  };

  return success(data, 'mock');
}
