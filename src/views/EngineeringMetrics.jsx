import sprints from '../data/sprints.json'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8, padding: '10px 14px' }}>
      <p className="text-sm font-semibold text-white mb-1">{label}</p>
      {payload.map(entry => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: <span className="font-medium">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function EngineeringMetrics() {
  const avgVelocity  = Math.round(sprints.reduce((s, sp) => s + sp.completedPoints, 0) / sprints.length)
  const avgPct       = Math.round(sprints.reduce((s, sp) => s + (sp.completedPoints / sp.committedPoints * 100), 0) / sprints.length)
  const totalBugs    = sprints.reduce((s, sp) => s + sp.bugs, 0)
  const last         = sprints[sprints.length - 1]
  const prev         = sprints[sprints.length - 2]
  const trendUp      = last.completedPoints >= prev.completedPoints

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Engineering Metrics</h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
          Sprint velocity, completion rate, and bug trends across last 6 sprints
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Avg Velocity',     value: avgVelocity + ' pts' },
          { label: 'Completion Rate',  value: avgPct + '%'         },
          { label: 'Total Bugs Filed', value: totalBugs            },
          { label: 'Sprint Trend',     value: (trendUp ? '+' : '') + (last.completedPoints - prev.completedPoints) + ' pts', accent: trendUp ? '#10b981' : '#f87171' },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-xl px-4 py-3 border"
            style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
          >
            <p className="text-xs mb-1" style={{ color: '#6b7280' }}>{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.accent || '#7c82ff' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl p-5 border mb-4"
        style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
      >
        <h2 className="text-sm font-semibold text-white mb-1">Sprint Velocity</h2>
        <p className="text-xs mb-4" style={{ color: '#4b5563' }}>Story points committed vs. completed per sprint</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={sprints} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2132" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#1e2132' }} />
            <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12, color: '#9ca3af' }} />
            <Bar dataKey="committedPoints" name="Committed" fill="#2a2d4e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completedPoints" name="Completed"  fill="#7c82ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div
          className="rounded-xl p-5 border"
          style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
        >
          <h2 className="text-sm font-semibold text-white mb-1">Velocity Trend</h2>
          <p className="text-xs mb-4" style={{ color: '#4b5563' }}>Completed story points over time</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={sprints} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2132" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#2a2d3e' }} />
              <Line
                type="monotone"
                dataKey="completedPoints"
                name="Velocity"
                stroke="#7c82ff"
                strokeWidth={2}
                dot={{ fill: '#7c82ff', r: 4 }}
                activeDot={{ r: 6, fill: '#a5a9ff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div
          className="rounded-xl p-5 border"
          style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
        >
          <h2 className="text-sm font-semibold text-white mb-1">Bugs Filed per Sprint</h2>
          <p className="text-xs mb-4" style={{ color: '#4b5563' }}>Higher is worse — target is 0–1 per sprint</p>
          <div className="flex items-end gap-2 h-28">
            {sprints.map(sprint => {
              const maxBugs = Math.max(...sprints.map(s => s.bugs), 1)
              const heightPct = (sprint.bugs / maxBugs) * 100
              const color = sprint.bugs > 3 ? '#ef4444' : sprint.bugs > 1 ? '#f59e0b' : '#10b981'
              return (
                <div key={sprint.id} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium" style={{ color: color }}>
                    {sprint.bugs}
                  </span>
                  <div className="w-full flex flex-col justify-end" style={{ height: 60 }}>
                    <div
                      className="w-full rounded-t transition-all"
                      style={{ height: `${Math.max(heightPct, sprint.bugs === 0 ? 4 : 8)}%`, backgroundColor: color, opacity: 0.85 }}
                    />
                  </div>
                  <span className="text-xs" style={{ color: '#4b5563' }}>
                    S{sprint.name.split(' ')[1]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
