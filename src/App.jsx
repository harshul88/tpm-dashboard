import { useState } from 'react'
import Sidebar from './components/Sidebar'
import SprintTracker from './views/SprintTracker'
import EngineeringMetrics from './views/EngineeringMetrics'
import Roadmap from './views/Roadmap'

const VIEWS = {
  sprint: SprintTracker,
  metrics: EngineeringMetrics,
  roadmap: Roadmap,
}

export default function App() {
  const [activeView, setActiveView] = useState('sprint')
  const ActiveComponent = VIEWS[activeView]

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0f1117' }}>
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 overflow-y-auto p-6">
        <ActiveComponent />
      </main>
    </div>
  )
}
