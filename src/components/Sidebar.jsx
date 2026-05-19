function IconSprint() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function IconMetrics() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconRoadmap() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

const NAV_ITEMS = [
  { id: 'sprint',  label: 'Sprint Tracker',    sub: 'Active sprint board',   Icon: IconSprint  },
  { id: 'metrics', label: 'Eng. Metrics',       sub: 'Velocity & health',     Icon: IconMetrics },
  { id: 'roadmap', label: 'Roadmap',            sub: 'Initiatives timeline',  Icon: IconRoadmap },
]

export default function Sidebar({ activeView, setActiveView }) {
  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col border-r"
      style={{ backgroundColor: '#13151f', borderColor: '#1e2132' }}
    >
      <div className="px-4 py-5 border-b" style={{ borderColor: '#1e2132' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: '#7c82ff' }}
          >
            T
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">TPM Dashboard</p>
            <p className="text-xs" style={{ color: '#4b5563' }}>Portfolio Project</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-3" style={{ color: '#374151' }}>
          Views
        </p>
        {NAV_ITEMS.map(({ id, label, sub, Icon }) => {
          const active = activeView === id
          return (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150"
              style={{
                backgroundColor: active ? '#1e2240' : 'transparent',
                color: active ? '#7c82ff' : '#6b7280',
              }}
            >
              <span style={{ color: active ? '#7c82ff' : '#4b5563' }}>
                <Icon />
              </span>
              <div>
                <p className="text-sm font-medium leading-tight" style={{ color: active ? '#a5a9ff' : '#9ca3af' }}>
                  {label}
                </p>
                <p className="text-xs" style={{ color: active ? '#6b7dcc' : '#374151' }}>
                  {sub}
                </p>
              </div>
            </button>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t" style={{ borderColor: '#1e2132' }}>
        <p className="text-xs font-medium" style={{ color: '#6b7280' }}>Harshul Kumar</p>
        <p className="text-xs" style={{ color: '#374151' }}>Technical Program Manager</p>
      </div>
    </aside>
  )
}
