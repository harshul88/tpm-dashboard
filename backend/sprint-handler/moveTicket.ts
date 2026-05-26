import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { success, fail, notImplemented } from '../shared/response';
import { TpmError } from '../shared/errors';
import { buildKey, invalidate } from '../shared/cache';
import { getDataSource } from '../shared/config';

const MOCK_PATH = process.env.MOCK_DATA_PATH ?? join(process.cwd(), 'src/data');

type TicketStatus = 'todo' | 'in-progress' | 'done';

const VALID_STATUSES: TicketStatus[] = ['todo', 'in-progress', 'done'];

interface MoveTicketBody {
  status: string;
}

interface RawTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  blocked: boolean;
  assignee: string;
  storyPoints: number;
  sprint: string;
  labels: string[];
}

function normalizeStatus(raw: string): TicketStatus | null {
  // Accept both API-style 'in_progress' and data-file style 'in-progress'
  const s = raw === 'in_progress' ? 'in-progress' : raw;
  return VALID_STATUSES.includes(s as TicketStatus) ? (s as TicketStatus) : null;
}

export async function moveTicket(
  event: APIGatewayProxyEvent,
  programId: string,
  ticketId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('sprintTracker');

  if (src === 'jira') return notImplemented('jira ticket move');
  if (src !== 'mock') return notImplemented(`ticket move from source: ${src}`);

  if (!event.body) return fail(TpmError.invalidParams('Request body is required'));

  let body: MoveTicketBody;
  try {
    body = JSON.parse(event.body) as MoveTicketBody;
  } catch {
    return fail(TpmError.invalidParams('Invalid JSON body'));
  }

  if (!body.status) return fail(TpmError.invalidParams('status is required'));

  const newStatus = normalizeStatus(body.status);
  if (!newStatus) {
    return fail(
      TpmError.invalidParams(
        `status must be one of: ${VALID_STATUSES.join(', ')} (or in_progress)`,
      ),
    );
  }

  const tickets = JSON.parse(
    readFileSync(join(MOCK_PATH, 'tickets.json'), 'utf-8'),
  ) as RawTicket[];

  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    return fail(TpmError.invalidParams(`Ticket ${ticketId} not found`));
  }

  // In-memory update only — mock source has no persistence layer
  ticket.status = newStatus;
  const updated_at = new Date().toISOString();

  // Bust the sprint current cache so next GET reflects the new status
  await invalidate(buildKey(programId, 'sprint', 'current'));

  return success(
    {
      ticket: {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        updated_at,
      },
    },
    src,
  );
}
