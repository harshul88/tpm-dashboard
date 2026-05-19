import deployments from '../data/deployments.json'
import incidents from '../data/incidents.json'
import pullRequests from '../data/pull_requests.json'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

// ── DORA calculations ─────────────────────────────────────────

const totalDeploys  = deployments.reduce((s, d) => s + d.deploys_count, 0)
const totalFailed   = deployments.reduce((s, d) => s + d.failed_count, 0)
const deployFreq    = totalDeploys / deployments.length          // per day avg

const cfr           = (totalFailed / totalDeploys) * 100

const resolvedInc   = incidents.filter(i => i.status === 'resolved')
const mttrMinutes   = resolvedInc.reduce((s, i) => {
  return s + (new Date(i.resolved_at) - new Date(i.opened_at)) / 60000
}, 0) / resolvedInc.length

const prsDeployed   = pullRequests.filter(pr => pr.deployed_at)
const leadTimeDays  = prsDeployed.reduce((s, pr) => {
  return s + (new Date(pr.deployed_at) - new Date(pr.created_at)) / 86400000
}, 0) / prsDeployed.length

// ── Trend calculations (first half vs second half) ────────────

const half      = Math.floor(deployments.length / 2)
const d1        = deployments.slice(0, half)
const d2        = deployments.slice(half)
const freq1     = d1.reduce((s, d) => s + d.deploys_count, 0) / d1.length
const freq2     = d2.reduce((s, d) => s + d.deploys_count, 0) / d2.length
const freqTrend = ((freq2 - freq1) / freq1) * 100

const cfr1      = d1.reduce((s, d) => s + d.failed_count, 0) / d1.reduce((s, d) => s + d.deploys_count, 0) * 100
const cfr2      = d2.reduce((s, d) => s + d.failed_count, 0) / d2.reduce((s, d) => s + d.deploys_count, 0) * 100
const cfrDelta  = cfr2 - cfr1   // negative = improvement

const prHalf    = Math.floor(prsDeployed.length / 2)
const lt1       = prsDeployed.slice(0, prHalf).reduce((s, pr) => s + (new Date(pr.deployed_at) - new Date(pr.created_at)) / 86400000, 0) / prHalf
const lt2       = prsDeployed.slice(prHalf).reduce((s, pr) => s + (new Date(pr.deployed_at) - new Date(pr.created_at)) / 86400000, 0) / (prsDeployed.length - prHalf)
const ltTrend   = ((lt2 - lt1) / lt1) * 100

const iHalf     = Math.floor(resolvedInc.length / 2)
const mttr1     = resolvedInc.slice(0, iHalf).reduce((s, i) => s + (new Date(i.resolved_at) - new Date(i.opened_at)) / 60000, 0) / iHalf
const mttr2     = resolvedInc.slice(iHalf).reduce((s, i) => s + (new Date(i.resolved_at) - new Date(i.opened_at)) / 60000, 0) / (resolvedInc.length - iHalf)
const mttrTrend = ((mttr2 - mttr1) / mttr1) * 100

// ── DORA tier thresholds (2024 benchmarks) ────────────────────

function deployFreqTier(v) {
  if (v >= 1)    return 'Elite'   // multiple deploys/day
  if (v >= 1/7)  return 'High'    // at least weekly
  if (v >= 1/30) return 'Medium'
  return 'Low'
}
function leadTimeTier(days) {
  if (days < 1)   return 'Elite'  // < 1 day
  if (days < 7)   return 'High'   // < 1 week
  if (days < 30)  return 'Medium'
  return 'Low'
}
function mttrTier(minutes) {
  if (minutes < 60)    return 'Elite'   // < 1 hour
  if (minutes < 1440)  return 'High'    // < 1 day
  if (minutes < 10080) return 'Medium'  // < 1 week
  return 'Low'
}
function cfrTier(pct) {
  if (pct < 5)   return 'Elite'
  if (pct < 10)  return 'High'
  if (pct < 15)  return 'Medium'
  return 'Low'
}

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(dateStr) {
  const [, m, d] = dateStr.split('-')
  const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${MONTHS[parseInt(m)]} ${parseInt(d)}`
}

function fmtMinutes(min) {
  if (min < 60) return `${Math.round(min)}m`
  return `${(min / 60).toFixed(1)}h`
}

function incidentDuration(inc) {
  if (!inc.resolved_at) return '—'
  return fmtMinutes((new Date(inc.resolved_at) - new Date(inc.opened_at)) / 60000)
}

// ── Sub-components ────────────────────────────────────────────

const TIER_STYLE = {
  Elite:  { bg: '#0f2a1e', text: '#34d399' },
  High:   { bg: '#1a2542', text: '#60a5fa' },
  Medium: { bg: '#2e2010', text: '#fbbf24' },
  Low:    { bg: '#2e1010', text: '#f87171' },
}

function DoraCard({ label, value, unit, tier, trendPct, higherIsBetter }) {
  const ts        = TIER_STYLE[tier]
  const improving = higherIsBetter ? trendPct > 0 : trendPct < 0
  const trendClr  = improving ? '#10b981' : '#f87171'
  const trendIcon = improving ? '↑' : '↓'

  return (
    <div className="rounded-xl px-4 py-4 border" style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}>
      <p className="text-xs mb-3" style={{ color: '#6b7280' }}>{label}</p>
      <p className="text-2xl font-bold text-white leading-none">
        {value}
        <span className="text-sm font-normal ml-1" style={{ color: '#4b5563' }}>{unit}</span>
      </p>
      <div className="flex items-center justify-between mt-3">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ backgroundColor: ts.bg, color: ts.text }}
        >
          {tier}
        </span>
        <span className="text-xs font-medium" style={{ color: trendClr }}>
          {trendPct > 0 ? '+' : ''}{Math.abs(trendPct).toFixed(1)}% {trendIcon}
        </span>
      </div>
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8, padding: '10px 14px' }}>
      <p className="text-xs font-semibold text-white mb-1">{label}</p>
      {payload.map(e => (
        <p key={e.name} className="text-xs" style={{ color: e.color }}>
          {e.name}: <span className="font-medium">{e.value}</span>
        </p>
      ))}
    </div>
  )
}

const SEV_STYLE = {
  P1: { bg: '#3a1010', text: '#f87171', border: '#7f1d1d' },
  P2: { bg: '#3a2010', text: '#fb923c', border: '#7c3012' },
  P3: { bg: '#2a2a10', text: '#fbbf24', border: '#78350f' },
}

function SevBadge({ sev }) {
  const s = SEV_STYLE[sev] || SEV_STYLE.P3
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-bold"
      style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {sev}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────

export default function EngineeringMetrics() {
  const deployChartData = deployments.map(d => ({
    label: fmtDate(d.date),
    Success: d.success_count,
    Failed:  d.failed_count,
  }))

  const leadTimeData = prsDeployed.map((pr, i) => ({
    pr:   `#${pr.id.split('-')[1]}`,
    days: parseFloat(((new Date(pr.deployed_at) - new Date(pr.created_at)) / 86400000).toFixed(2)),
  }))

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Engineering Metrics</h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
          DORA metrics &middot; Apr 22 – May 19, 2026 &middot; 28-day rolling window
        </p>
      </div>

      {/* ── DORA Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <DoraCard
          label="Deployment Frequency"
          value={deployFreq.toFixed(2)}
          unit="/ day"
          tier={deployFreqTier(deployFreq)}
          trendPct={freqTrend}
          higherIsBetter
        />
        <DoraCard
          label="Lead Time for Changes"
          value={leadTimeDays.toFixed(1)}
          unit="days"
          tier={leadTimeTier(leadTimeDays)}
          trendPct={ltTrend}
          higherIsBetter={false}
        />
        <DoraCard
          label="Mean Time to Recovery"
          value={fmtMinutes(mttrMinutes)}
          unit=""
          tier={mttrTier(mttrMinutes)}
          trendPct={mttrTrend}
          higherIsBetter={false}
        />
        <DoraCard
          label="Change Failure Rate"
          value={cfr.toFixed(1)}
          unit="%"
          tier={cfrTier(cfr)}
          trendPct={cfrDelta}
          higherIsBetter={false}
        />
      </div>

      {/* ── Charts Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-4 mb-4">

        {/* Deployment Frequency — 28-day stacked bar */}
        <div
          className="col-span-3 rounded-xl p-5 border"
          style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
        >
          <h2 className="text-sm font-semibold text-white mb-1">Deployment Frequency</h2>
          <p className="text-xs mb-4" style={{ color: '#4b5563' }}>
            Daily deploy volume — success vs. failed &middot; last 28 days
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deployChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2132" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={3}
              />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#1e2240' }} />
              <Bar dataKey="Success" stackId="a" fill="#7c82ff" fillOpacity={0.85} />
              <Bar dataKey="Failed"  stackId="a" fill="#ef4444" fillOpacity={0.9} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#6b7280' }}>
              <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: '#7c82ff', opacity: 0.85 }} />
              Successful
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#6b7280' }}>
              <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: '#ef4444' }} />
              Failed
            </span>
          </div>
        </div>

        {/* Lead Time — per-PR scatter/line */}
        <div
          className="col-span-2 rounded-xl p-5 border"
          style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
        >
          <h2 className="text-sm font-semibold text-white mb-1">Lead Time per PR</h2>
          <p className="text-xs mb-4" style={{ color: '#4b5563' }}>
            Days from PR creation to production deploy
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={leadTimeData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2132" vertical={false} />
              <XAxis
                dataKey="pr"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={3}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'days', angle: -90, position: 'insideLeft', fill: '#374151', fontSize: 10, dx: 16 }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#2a2d3e' }} />
              <Line
                type="monotone"
                dataKey="days"
                name="Lead time"
                stroke="#7c82ff"
                strokeWidth={2}
                dot={({ cx, cy, payload }) => (
                  <circle
                    key={payload.pr}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={payload.days >= 3 ? '#f59e0b' : '#7c82ff'}
                    stroke="none"
                  />
                )}
                activeDot={{ r: 5, fill: '#a5a9ff', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Incidents Table ─────────────────────────────────── */}
      <div
        className="rounded-xl border"
        style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#1e2132' }}>
          <div>
            <h2 className="text-sm font-semibold text-white">Incident Log</h2>
            <p className="text-xs mt-0.5" style={{ color: '#4b5563' }}>
              {resolvedInc.length} resolved &middot; {incidents.filter(i => i.status === 'open').length} open &middot; avg MTTR {fmtMinutes(mttrMinutes)}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: '#6b7280' }}>
            {['P1', 'P2', 'P3'].map(sev => {
              const count = incidents.filter(i => i.severity === sev).length
              const s = SEV_STYLE[sev]
              return (
                <span key={sev} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.text }} />
                  {count} {sev}
                </span>
              )
            })}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #1e2132' }}>
              {['ID', 'Title', 'Severity', 'Opened', 'Duration', 'Status'].map(h => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: '#4b5563' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...incidents].reverse().map((inc, i) => {
              const isOpen = inc.status === 'open'
              return (
                <tr
                  key={inc.id}
                  style={{ borderBottom: i < incidents.length - 1 ? '1px solid #1a1d2e' : 'none' }}
                >
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: '#7c82ff' }}>{inc.id}</td>
                  <td className="px-5 py-3 text-sm text-white max-w-xs truncate">{inc.title}</td>
                  <td className="px-5 py-3"><SevBadge sev={inc.severity} /></td>
                  <td className="px-5 py-3 text-xs" style={{ color: '#6b7280' }}>
                    {new Date(inc.opened_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-3 text-xs font-medium" style={{ color: isOpen ? '#f59e0b' : '#9ca3af' }}>
                    {incidentDuration(inc)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={
                        isOpen
                          ? { backgroundColor: '#3a2010', color: '#f59e0b' }
                          : { backgroundColor: '#0f2a1e', color: '#34d399' }
                      }
                    >
                      {inc.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
