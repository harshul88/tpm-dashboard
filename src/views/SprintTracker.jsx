import tickets from '../data/tickets.json'

const COLUMNS = [
  { id: 'todo',        label: 'To Do',       dotColor: '#6b7280' },
  { id: 'in-progress', label: 'In Progress', dotColor: '#f59e0b' },
  { id: 'done',        label: 'Done',        dotColor: '#10b981' },
]

const PRIORITY = {
  critical: { bg: '#3f1515', text: '#f87171', border: '#7f1d1d' },
  high:     { bg: '#3f2a15', text: '#fb923c', border: '#7c3012' },
  medium:   { bg: '#1e3a5f', text: '#60a5fa', border: '#1e40af' },
  low:      { bg: '#1a2e1a', text: '#4ade80', border: '#14532d' },
}

function PriorityBadge({ priority }) {
  const c = PRIORITY[priority] || PRIORITY.medium
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium border"
      style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
    >
      {priority}
    </span>
  )
}

function TicketCard({ ticket }) {
  return (
    <div
      className="p-3 rounded-lg mb-2 border transition-colors cursor-pointer"
      style={{ backgroundColor: '#0f1117', borderColor: '#1e2132' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-semibold" style={{ color: '#7c82ff' }}>{ticket.id}</span>
        <span
          className="text-xs px-1.5 py-0.5 rounded font-medium"
          style={{ backgroundColor: '#1e2132', color: '#6b7280' }}
        >
          {ticket.storyPoints} pts
        </span>
      </div>

      <p className="text-sm font-medium text-white mb-1 leading-tight">{ticket.title}</p>
      <p className="text-xs mb-3 leading-relaxed" style={{ color: '#4b5563' }}>{ticket.description}</p>

      <div className="flex items-center justify-between">
        <PriorityBadge priority={ticket.priority} />
        <span className="text-xs" style={{ color: '#4b5563' }}>
          {ticket.assignee === 'Unassigned' ? '—' : ticket.assignee.split(' ')[0]}
        </span>
      </div>

      {ticket.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {ticket.labels.map(label => (
            <span
              key={label}
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: '#1a1d2e', color: '#4b5563' }}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SprintTracker() {
  const byStatus = Object.fromEntries(
    COLUMNS.map(col => [col.id, tickets.filter(t => t.status === col.id)])
  )
  const totalPts   = tickets.reduce((s, t) => s + t.storyPoints, 0)
  const donePts    = byStatus['done'].reduce((s, t) => s + t.storyPoints, 0)
  const activePts  = byStatus['in-progress'].reduce((s, t) => s + t.storyPoints, 0)
  const pct        = Math.round((donePts / totalPts) * 100)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Sprint Tracker</h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
          Sprint 6 &middot; Active &middot; Jan 20 – Feb 7, 2026
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Tickets',  value: tickets.length },
          { label: 'Total Points',   value: totalPts       },
          { label: 'Points Done',    value: donePts        },
          { label: 'Completion',     value: pct + '%'      },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-xl px-4 py-3 border"
            style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
          >
            <p className="text-xs mb-1" style={{ color: '#6b7280' }}>{s.label}</p>
            <p className="text-xl font-bold" style={{ color: '#7c82ff' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map(col => (
          <div key={col.id}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.dotColor }} />
              <h2 className="text-sm font-semibold text-white">{col.label}</h2>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: '#1e2132', color: '#6b7280' }}
              >
                {byStatus[col.id].length}
              </span>
            </div>

            <div
              className="rounded-xl p-3 min-h-32"
              style={{ backgroundColor: '#13151f', border: '1px solid #1e2132' }}
            >
              {byStatus[col.id].map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
              {byStatus[col.id].length === 0 && (
                <p className="text-xs text-center py-6" style={{ color: '#374151' }}>No tickets</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
