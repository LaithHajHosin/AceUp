import { NavLink, Outlet } from 'react-router-dom'
import './App.css'

const navigation = [
  { label: 'Question bank', path: '/questions' },
  { label: 'Practice setup', path: '/setup' },
  { label: 'Results', path: '/results' },
  { label: 'History', path: '/history' },
]

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/setup" aria-label="PrepPressure home">
          <span className="brand-mark">P</span>
          <span>
            <strong>PrepPressure</strong>
            <small>Interview practice</small>
          </span>
        </NavLink>

        <div className="nav-label">Workspace</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ label, path }) => (
            <NavLink
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              key={path}
              to={path}
              end={path !== '/results'}
            >
              <span className="nav-indicator" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="note-icon" aria-hidden="true">i</span>
          <p>Practice sessions are private to this browser. Use a nickname, not sensitive personal information.</p>
        </div>
        <div className="sidebar-footer">Build confidence, one question at a time.</div>
      </aside>

      <div className="app-content">
        <header className="topbar">
          <span className="breadcrumb">Your workspace <span>/</span> Practice</span>
          <span className="status-pill"><span /> Interview prep</span>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default App
