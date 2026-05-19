import tickets from '../data/tickets.json'
import sprints from '../data/sprints.json'
import {
  ComposedChart, BarChart,
  Line, Area, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

// ── Burndown config ───────────────────────────────────────────
const SPRINT_DAYS   = 14
const CURRENT_DAY   = 8
const COMMITTED_PTS = 44

// Story points remaining at end of each day; null = future
const ACTUAL_REMAINING = [44, 44, 41, 41, 38, 36, 36, 31, 31, null, null, null, null, null, null]

const BURNDOWN = Array.from({ length: SPRINT_DAYS + 1 }, (_, i) => ({
  day: `D${i}`,
  ideal: Math.round((COMMITTED_PTS - (COMMITTED_PTS / SPRINT_DAYS) * i) * 10) / 10,
  actual: ACTUAL_REMAINING[i] !== undefined ? ACTUAL_REMAINING[i] : null,
}))

// ── Kanban config ─────────────────────────────────────────────
const COLUMNS = [
  { id: 'todo',        label: 'To Do',       dot: '#6b7280' },
  { id: 'in-progress', label: 'In Progress', dot: '#f59e0b' },
  { id: 'done',        label: 'Done',        dot: '#10b981' },
]

const TYPE_STYLE = {
  Frontend: { bg: '#1a2542', text: '#60a5fa', border: '#1e3a7a' },
  Backend:  { bg: '#1a2e1a', text: '#4ade80', border: '#14532d' },
  QA:       { bg: '#2e1a3a', text: '#c084fc', border: '#5b21b6' },
}

// ── Sub-components ────────────────────────────────────────────
function TypeTag({ type }) {
  const s = TYPE_STYLE[type] || TYPE_STYLE.Backend
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-md font-medium"
      style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {type}
    </span>
  )
}

function TicketCard({ ticket }) {
  const active = ticket.status === 'in-progress'
  return (
    <div
      className="p-3 rounded-lg mb-2 transition-all"
      style={{
        backgroundColor: '#0f1117',
        border: '1px solid #1e2132',
        borderLeft: active ? '3px solid #7c82ff' : '1px solid #1e2132',
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono font-semibold" style={{ color: '#7c82ff' }}>
          {ticket.id}
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded font-semibold"
          style={{ backgroundColor: '#1e2132', color: '#9ca3af' }}
        >
          {ticket.storyPoints} pts
        </span>
      </div>

      <p className="text-sm font-medium text-white mb-2 leading-tight">{ticket.title}</p>

      <div className="flex items-center justify-between">
        <TypeTag type={ticket.type} />
        {ticket.blocked && (
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ backgroundColor: '#3f1515', color: '#f87171' }}
          >
            blocked
          </span>
        )}
      </div>
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8, padding: '10px 14px' }}>
      <p className="text-xs font-semibold text-white mb-1">{label}</p>
      {payload.map(e =>
        e.value != null && (
          <p key={e.name} className="text-xs" style={{ color: e.color ?? e.stroke }}>
            {e.name}: <span className="font-medium">{e.value} pts</span>
          </p>
        )
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function SprintTracker() {
  const byStatus  = Object.fromEntries(COLUMNS.map(c => [c.id, tickets.filter(t => t.status === c.id)]))
  const donePts   = byStatus['done'].reduce((s, t) => s + t.storyPoints, 0)
  const doneCount = byStatus['done'].length
  const blockers  = tickets.filter(t => t.blocked).length
  const pct       = Math.round((donePts / COMMITTED_PTS) * 100)
  const behindBy  = Math.round(BURNDOWN[CURRENT_DAY].actual - BURNDOWN[CURRENT_DAY].ideal)

  const activeSprint = sprints.find(s => s.isActive)
  const velocityData = sprints.map(s => ({
    name: s.name.replace('Sprint ', 'S'),
    points: s.completedPoints,
    isActive: s.isActive,
  }))

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Sprint Tracker</h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
          {activeSprint.name} &middot; Active &middot; {activeSprint.startDate} &ndash; {activeSprint.endDate}
        </p>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Points Committed',  value: COMMITTED_PTS               },
          { label: 'Tickets Completed', value: `${doneCount} / ${tickets.length}` },
          { label: 'Blockers Open',     value: blockers, warn: blockers > 0 },
          { label: 'Completion Rate',   value: pct + '%'                   },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-xl px-4 py-3 border"
            style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
          >
            <p className="text-xs mb-1" style={{ color: '#6b7280' }}>{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.warn ? '#f87171' : '#7c82ff' }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Kanban Board ───────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {COLUMNS.map(col => {
          const colTickets = byStatus[col.id]
          const colPts = colTickets.reduce((s, t) => s + t.storyPoints, 0)
          return (
            <div key={col.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.dot }} />
                <h2 className="text-sm font-semibold text-white">{col.label}</h2>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#1e2132', color: '#6b7280' }}
                >
                  {colTickets.length}
                </span>
                <span className="text-xs ml-auto" style={{ color: '#374151' }}>
                  {colPts} pts
                </span>
              </div>
              <div
                className="rounded-xl p-3 min-h-36"
                style={{ backgroundColor: '#13151f', border: '1px solid #1e2132' }}
              >
                {colTickets.map(t => <TicketCard key={t.id} ticket={t} />)}
                {colTickets.length === 0 && (
                  <p className="text-xs text-center py-6" style={{ color: '#374151' }}>No tickets</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Charts Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-4">

        {/* Burndown Chart */}
        <div
          className="col-span-3 rounded-xl p-5 border"
          style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Sprint Burndown</h2>
              <p className="text-xs mt-0.5" style={{ color: '#4b5563' }}>
                Story points remaining &middot; Day {CURRENT_DAY} of {SPRINT_DAYS}
              </p>
            </div>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: '#3f2a15', color: '#fb923c' }}
            >
              Behind by {behindBy} pts
            </span>
          </div>

          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={BURNDOWN} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2132" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={[0, COMMITTED_PTS]}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#2a2d3e', strokeWidth: 1 }} />

              {/* Today marker */}
              <ReferenceLine
                x={`D${CURRENT_DAY}`}
                stroke="#7c82ff"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                label={{ value: 'Today', fill: '#7c82ff', fontSize: 10, position: 'insideTopLeft' }}
              />

              {/* Ideal dashed line */}
              <Line
                type="monotone"
                dataKey="ideal"
                name="Ideal"
                stroke="#374151"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                legendType="none"
              />

              {/* Actual area + line */}
              <Area
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="#7c82ff"
                strokeWidth={2.5}
                fill="#7c82ff18"
                dot={{ fill: '#7c82ff', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#a5a9ff', strokeWidth: 0 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-1">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#6b7280' }}>
              <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#374151" strokeWidth="1.5" strokeDasharray="5 3" /></svg>
              Ideal
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#6b7280' }}>
              <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#7c82ff" strokeWidth="2.5" /></svg>
              Actual
            </span>
          </div>
        </div>

        {/* Velocity Chart */}
        <div
          className="col-span-2 rounded-xl p-5 border"
          style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
        >
          <h2 className="text-sm font-semibold text-white mb-1">Velocity</h2>
          <p className="text-xs mb-4" style={{ color: '#4b5563' }}>
            Completed story points per sprint
          </p>

          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={velocityData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2132" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#1e2132' }} />
              <Bar dataKey="points" name="Points" radius={[4, 4, 0, 0]}>
                {velocityData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isActive ? '#f59e0b' : '#7c82ff'}
                    fillOpacity={entry.isActive ? 0.9 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="flex items-center gap-4 mt-1">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#6b7280' }}>
              <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: '#7c82ff', opacity: 0.7 }} />
              Completed
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#6b7280' }}>
              <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: '#f59e0b' }} />
              In Progress
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
