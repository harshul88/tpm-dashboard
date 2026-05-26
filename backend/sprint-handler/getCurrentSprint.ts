import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { success, notImplemented } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

const MOCK_PATH = process.env.MOCK_DATA_PATH ?? join(process.cwd(), 'src/data');

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

interface RawSprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  committedPoints: number;
  completedPoints: number;
  isActive: boolean;
}

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  blocked: boolean;
  assignee: string;
  points: number;
  labels: string[];
}

interface Burndown {
  days: number[];
  ideal: number[];
  actual: (number | null)[];
  today_marker: number;
}

function buildBurndown(sprint: RawSprint): Burndown {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const startMs = new Date(sprint.startDate).getTime();
  const endMs = new Date(sprint.endDate).getTime();
  const sprintDays = Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY));
  const daysSinceStart = Math.round((Date.now() - startMs) / MS_PER_DAY);
  const todayMarker = Math.max(0, Math.min(daysSinceStart, sprintDays));

  const days = Array.from({ length: sprintDays + 1 }, (_, i) => i);

  // Ideal: linear decline from committedPoints to 0
  const ideal = days.map((d) =>
    Math.max(0, Math.round(sprint.committedPoints - (sprint.committedPoints / sprintDays) * d)),
  );

  // Actual: interpolate from committedPoints remaining at day 0
  // to (committedPoints - completedPoints) at todayMarker
  const remaining = sprint.committedPoints - sprint.completedPoints;
  const actual: (number | null)[] = days.map((d) => {
    if (d > todayMarker) return null;
    if (todayMarker === 0) return sprint.committedPoints;
    const burned = ((sprint.committedPoints - remaining) / todayMarker) * d;
    return Math.max(0, Math.round(sprint.committedPoints - burned));
  });

  return { days, ideal, actual, today_marker: todayMarker };
}

export async function getCurrentSprint(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('sprintTracker');
  const key = buildKey(programId, 'sprint', 'current');

  const cached = await get(key);
  if (cached) return success(cached.data, src, true, cached.cachedAt);

  if (src !== 'mock') return notImplemented(`sprint/current from source: ${src}`);

  const allTickets = JSON.parse(
    readFileSync(join(MOCK_PATH, 'tickets.json'), 'utf-8'),
  ) as RawTicket[];

  const allSprints = JSON.parse(
    readFileSync(join(MOCK_PATH, 'sprints.json'), 'utf-8'),
  ) as RawSprint[];

  const activeSprint =
    allSprints.find((s) => s.isActive) ?? allSprints[allSprints.length - 1];

  const sprintTickets = allTickets.filter((t) => t.sprint === activeSprint.name);

  const committed_points = sprintTickets.reduce((sum, t) => sum + t.storyPoints, 0);
  const completed_points = sprintTickets
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + t.storyPoints, 0);
  const blockers_count = sprintTickets.filter((t) => t.blocked).length;
  const completion_rate =
    committed_points > 0 ? Math.round((completed_points / committed_points) * 100) : 0;

  const msRemaining = new Date(activeSprint.endDate).getTime() - Date.now();
  const days_remaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

  const tickets: Ticket[] = sprintTickets.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    type: t.type,
    blocked: t.blocked,
    assignee: t.assignee,
    points: t.storyPoints,
    labels: t.labels,
  }));

  const data = {
    id: activeSprint.id,
    name: activeSprint.name,
    start_date: activeSprint.startDate,
    end_date: activeSprint.endDate,
    committed_points,
    completed_points,
    days_remaining,
    completion_rate,
    blockers_count,
    tickets,
    burndown: buildBurndown(activeSprint),
  };

  await set(key, data, getCacheTtl());
  return success(data, src);
}
