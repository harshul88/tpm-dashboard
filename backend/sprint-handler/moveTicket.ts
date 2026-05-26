import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, fail, dataPoint } from '../shared/response';
import { TpmError } from '../shared/errors';

type TicketStatus = 'todo' | 'in-progress' | 'done' | 'blocked';

interface MoveTicketBody {
  status?: TicketStatus;
  blockerNote?: string | null;
}

export async function moveTicket(
  event: APIGatewayProxyEvent,
  programId: string,
  ticketId: string,
): Promise<APIGatewayProxyResult> {
  if (!event.body) return fail(TpmError.invalidParams('Request body is required'));

  let body: MoveTicketBody;
  try {
    body = JSON.parse(event.body) as MoveTicketBody;
  } catch {
    return fail(TpmError.invalidParams('Invalid JSON body'));
  }

  // Mock mode only in v1 — live source writes are v2
  const updated = {
    id: ticketId,
    title: 'Ticket title',
    status: body.status ?? 'todo',
    points: dataPoint(3, 'mock', 'tpm'),
    assignee: '',
    blockerNote: body.blockerNote ?? null,
  };

  return success(updated, 'mock');
}
