import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import AiPage from './pages/AiPage'
import HomePage from './pages/HomePage'
import PlannerPage from './pages/PlannerPage'
import PreferencesPage from './pages/PreferencesPage'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/planner', label: 'Planner' },
  { to: '/ai', label: 'AI' },
  { to: '/preferences', label: 'Preferences' },
]

function App() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-primary/30 bg-primary text-white shadow-md shadow-primary/30">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              AIMealPlanner
            </p>
            <p className="text-2xl font-semibold text-white sm:text-3xl">Meal Planner</p>
          </div>

          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'rounded-full border px-4 py-2 text-sm font-semibold tracking-wide transition-colors',
                    isActive
                      ? 'border-white bg-white text-primary'
                      : 'border-white/35 bg-primary/30 text-white hover:bg-white/20',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/ai" element={<AiPage />} />
          <Route path="/preferences" element={<PreferencesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
