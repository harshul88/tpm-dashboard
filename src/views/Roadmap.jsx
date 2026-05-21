import initiatives from '../data/initiatives.json'
import okrs        from '../data/okrs.json'
import risks       from '../data/risks.json'
import capacity    from '../data/team_capacity.json'

// ── Timeline config (Apr 1 – Sep 30, 2026) ───────────────────
const TIMELINE_START = new Date('2026-04-01')
const TIMELINE_END   = new Date('2026-09-30')
const TODAY          = new Date('2026-05-19')
const TOTAL_MS       = TIMELINE_END - TIMELINE_START
const MONTHS         = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']

function pct(date) {
  return Math.max(0, Math.min(100, ((new Date(date) - TIMELINE_START) / TOTAL_MS) * 100))
}

const STATUS_STYLE = {
  'On track':  { bar: '#7c82ff', track: '#7c82ff22', text: '#7c82ff', bg: '#1e2240', dot: '#7c82ff' },
  'At risk':   { bar: '#f59e0b', track: '#f59e0b22', text: '#f59e0b', bg: '#2e2010', dot: '#f59e0b' },
  'Off track': { bar: '#ef4444', track: '#ef444422', text: '#f87171', bg: '#2e1010', dot: '#ef4444' },
  'Planned':   { bar: '#4b5563', track: '#4b556322', text: '#9ca3af', bg: '#1e2132', dot: '#6b7280' },
}

const SEV_STYLE = {
  HIGH:   { bg: '#3f1515', text: '#f87171', border: '#7f1d1d' },
  MEDIUM: { bg: '#2e2010', text: '#fbbf24', border: '#78350f' },
  LOW:    { bg: '#0f2010', text: '#4ade80', border: '#14532d' },
}

// ── Sub-components ────────────────────────────────────────────
function StatusDot({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE['Planned']
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.dot }} />
      {status}
    </span>
  )
}

function GanttRow({ initiative }) {
  const s      = STATUS_STYLE[initiative.status] || STATUS_STYLE['Planned']
  const left   = pct(initiative.start_date)
  const right  = pct(initiative.end_date)
  const width  = right - left
  const filled = width * (initiative.pct_complete / 100)

  return (
    <div className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid #1e2132' }}>
      {/* Name column */}
      <div className="w-52 flex-shrink-0">
        <p className="text-xs font-medium text-white truncate">{initiative.name}</p>
        <p className="text-xs mt-0.5" style={{ color: '#4b5563' }}>{initiative.team}</p>
      </div>

      {/* Bar track */}
      <div className="flex-1 relative h-7">
        {/* Full duration track (ghost) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-full h-4"
          style={{ left: `${left}%`, width: `${width}%`, backgroundColor: s.track }}
        />
        {/* Progress fill */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-full h-4"
          style={{ left: `${left}%`, width: `${filled}%`, backgroundColor: s.bar, opacity: 0.9 }}
        />
        {/* Today line */}
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{ left: `${pct(TODAY)}%`, backgroundColor: '#7c82ff', opacity: 0.5 }}
        />
      </div>

      {/* Pct column */}
      <div className="w-10 flex-shrink-0 text-right">
        <span className="text-xs font-semibold" style={{ color: s.text }}>
          {initiative.pct_complete}%
        </span>
      </div>
    </div>
  )
}

function KrBar({ kr }) {
  const isLowerBetter = ['ms', 'hrs', 'min', 'findings'].includes(kr.unit)
  let rawPct
  if (isLowerBetter) {
    rawPct = kr.current_value <= kr.target_value
      ? 100
      : Math.max(0, 100 - ((kr.current_value - kr.target_value) / kr.target_value) * 100)
  } else {
    rawPct = Math.min(100, (kr.current_value / kr.target_value) * 100)
  }
  const barPct  = Math.round(rawPct)
  const color   = barPct >= 80 ? '#34d399' : barPct >= 50 ? '#60a5fa' : '#f87171'

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between items-baseline mb-1">
        <p className="text-xs text-white leading-tight pr-2">{kr.title}</p>
        <span className="text-xs font-semibold flex-shrink-0" style={{ color }}>
          {kr.current_value}{kr.unit} / {kr.target_value}{kr.unit}
        </span>
      </div>
      <div className="rounded-full h-1.5" style={{ backgroundColor: '#1e2132' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${barPct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function Roadmap() {
  const total     = initiatives.length
  const onTrack   = initiatives.filter(i => i.status === 'On track').length
  const atRisk    = initiatives.filter(i => i.status === 'At risk').length
  const offTrack  = initiatives.filter(i => i.status === 'Off track').length
  const avgPct    = Math.round(initiatives.reduce((s, i) => s + i.pct_complete, 0) / total)

  const todayPct  = pct(TODAY)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Portfolio Roadmap</h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
          H1 2026 · 8 strategic initiatives · Today: May 19
        </p>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total Initiatives', value: total,    color: '#7c82ff' },
          { label: 'On Track',          value: onTrack,  color: '#34d399' },
          { label: 'At Risk',           value: atRisk,   color: '#f59e0b' },
          { label: 'Off Track',         value: offTrack, color: '#f87171' },
          { label: 'Avg Completion',    value: avgPct + '%', color: '#60a5fa' },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-xl px-4 py-3 border"
            style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
          >
            <p className="text-xs mb-1" style={{ color: '#6b7280' }}>{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Gantt Chart ────────────────────────────────────── */}
      <div
        className="rounded-xl p-5 border mb-6"
        style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Initiative Timeline</h2>
            <p className="text-xs mt-0.5" style={{ color: '#4b5563' }}>Apr 2026 – Sep 2026</p>
          </div>
          <div className="flex items-center gap-4">
            {Object.entries(STATUS_STYLE).map(([label, s]) => (
              <span key={label} className="flex items-center gap-1.5 text-xs" style={{ color: '#6b7280' }}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.bar, opacity: 0.85 }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Month ruler */}
        <div className="flex ml-[224px] mr-[52px] mb-1">
          {MONTHS.map((m, i) => (
            <div key={m} className="flex-1 text-xs" style={{ color: '#374151' }}>
              {m}
            </div>
          ))}
        </div>

        {/* Today marker label */}
        <div className="relative ml-[224px] mr-[52px] h-0">
          <div
            className="absolute text-xs font-medium"
            style={{ left: `calc(${todayPct}% - 14px)`, color: '#7c82ff', top: -2 }}
          >
            Today
          </div>
        </div>

        {/* Rows */}
        <div className="mt-4">
          {initiatives.map(ini => <GanttRow key={ini.id} initiative={ini} />)}
        </div>
      </div>

      {/* ── OKR Grid ───────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">OKR Progress</h2>
        <div className="grid grid-cols-2 gap-4">
          {okrs.map(obj => (
            <div
              key={obj.objective}
              className="rounded-xl p-5 border"
              style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#7c82ff' }} />
                <h3 className="text-sm font-semibold text-white">{obj.objective}</h3>
              </div>
              {obj.key_results.map((kr, i) => <KrBar key={i} kr={kr} />)}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Team Capacity */}
        <div
          className="rounded-xl p-5 border"
          style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
        >
          <h2 className="text-sm font-semibold text-white mb-1">Team Capacity</h2>
          <p className="text-xs mb-4" style={{ color: '#4b5563' }}>% of bandwidth allocated to active initiatives</p>
          <div className="space-y-3">
            {capacity.map(c => {
              const over  = c.allocated_pct > 100
              const warn  = c.allocated_pct >= 90 && !over
              const color = over ? '#f87171' : warn ? '#f59e0b' : '#7c82ff'
              const barW  = Math.min(c.allocated_pct, 100)
              return (
                <div key={c.team}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-medium text-white">{c.team}</span>
                    <span className="text-xs font-semibold" style={{ color }}>
                      {c.allocated_pct}%{over ? ' ▲' : ''}
                    </span>
                  </div>
                  <div className="rounded-full h-2" style={{ backgroundColor: '#1e2132' }}>
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${barW}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Risk Register */}
        <div
          className="rounded-xl p-5 border"
          style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
        >
          <h2 className="text-sm font-semibold text-white mb-1">Risk Register</h2>
          <p className="text-xs mb-4" style={{ color: '#4b5563' }}>{risks.length} open risks across {new Set(risks.map(r => r.initiative_id)).size} initiatives</p>
          <div className="space-y-3">
            {risks.map(r => {
              const s    = SEV_STYLE[r.severity]
              const ini  = initiatives.find(i => i.id === r.initiative_id)
              return (
                <div
                  key={r.id}
                  className="rounded-lg p-3"
                  style={{ backgroundColor: '#0f1117', border: '1px solid #1e2132' }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-medium text-white leading-tight">{r.title}</p>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                      style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}
                    >
                      {r.severity}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed mb-1.5" style={{ color: '#4b5563' }}>
                    {r.description}
                  </p>
                  {ini && (
                    <span className="text-xs font-mono" style={{ color: '#374151' }}>
                      {r.initiative_id} · {ini.name}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
