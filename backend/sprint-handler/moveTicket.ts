import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok, err } from '../shared/response';
import { ErrorCode } from '../shared/errors';

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
  if (!event.body) {
    return err(ErrorCode.INVALID_PARAMS, 'Request body is required', programId);
  }

  let body: MoveTicketBody;
  try {
    body = JSON.parse(event.body) as MoveTicketBody;
  } catch {
    return err(ErrorCode.INVALID_PARAMS, 'Invalid JSON body', programId);
  }

  // Mock mode only in v1 — live source writes are not implemented
  const updated = {
    id: ticketId,
    title: 'Ticket title',
    status: body.status ?? 'todo',
    points: { value: 3, source_at_time: 'mock', recorded_at: new Date().toISOString(), updated_by: 'tpm' },
    assignee: '',
    blockerNote: body.blockerNote ?? null,
  };

  return ok(updated, { programId, source: 'mock' });
}
