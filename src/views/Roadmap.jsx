import initiatives from '../data/initiatives.json'

const STATUS = {
  'planned':     { bg: '#1e2132', text: '#9ca3af', dot: '#6b7280'  },
  'in-progress': { bg: '#1e3a5f', text: '#60a5fa', dot: '#3b82f6'  },
  'at-risk':     { bg: '#3f2015', text: '#f97316', dot: '#f97316'  },
  'completed':   { bg: '#0f2a1e', text: '#34d399', dot: '#10b981'  },
  'blocked':     { bg: '#3f1515', text: '#f87171', dot: '#ef4444'  },
}

const PRIORITY_COLOR = {
  critical: '#f87171',
  high:     '#fb923c',
  medium:   '#60a5fa',
  low:      '#4ade80',
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.planned
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium capitalize whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.dot }} />
      {status.replace('-', ' ')}
    </span>
  )
}

function ProgressBar({ progress }) {
  const color = progress >= 75 ? '#10b981' : progress >= 40 ? '#7c82ff' : '#f59e0b'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 rounded-full h-1.5" style={{ backgroundColor: '#1e2132' }}>
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right" style={{ color: '#9ca3af' }}>
        {progress}%
      </span>
    </div>
  )
}

export default function Roadmap() {
  const count = (s) => initiatives.filter(i => i.status === s).length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Roadmap</h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
          Strategic initiatives, owners, timelines, and delivery status
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Initiatives', value: initiatives.length                              },
          { label: 'In Progress',       value: count('in-progress')                           },
          { label: 'At Risk / Blocked', value: count('at-risk') + count('blocked'), warn: true },
          { label: 'Completed',         value: count('completed'),                  good: true },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-xl px-4 py-3 border"
            style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
          >
            <p className="text-xs mb-1" style={{ color: '#6b7280' }}>{s.label}</p>
            <p
              className="text-xl font-bold"
              style={{ color: s.warn && s.value > 0 ? '#f97316' : s.good ? '#10b981' : '#7c82ff' }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {initiatives.map(init => (
          <div
            key={init.id}
            className="rounded-xl p-4 border"
            style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-sm font-semibold text-white">{init.title}</h3>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ backgroundColor: '#1e2132', color: PRIORITY_COLOR[init.priority] }}
                  >
                    {init.priority}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
                  {init.description}
                </p>
              </div>
              <StatusBadge status={init.status} />
            </div>

            <div className="flex items-center gap-5 mb-3 flex-wrap">
              <span className="text-xs" style={{ color: '#4b5563' }}>
                <span style={{ color: '#374151' }}>Dates</span>&nbsp; {init.startDate} &rarr; {init.endDate}
              </span>
              <span className="text-xs" style={{ color: '#4b5563' }}>
                <span style={{ color: '#374151' }}>Owner</span>&nbsp; {init.owner}
              </span>
              <span className="text-xs" style={{ color: '#4b5563' }}>
                <span style={{ color: '#374151' }}>Team</span>&nbsp; {init.team}
              </span>
            </div>

            <ProgressBar progress={init.progress} />
          </div>
        ))}
      </div>
    </div>
  )
}
