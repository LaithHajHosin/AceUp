import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './features/auth/AuthContext'
import './App.css'

const navigation = [
  { label: 'Practice setup', path: '/setup' },
  { label: 'Interview', path: '/interviews/1/take' },
  { label: 'Profile', path: '/profile' },
]

function App() {
  const { isAuthenticated, user, logout } = useAuth()
  const location = useLocation()

  if (location.pathname === '/login' || location.pathname === '/register') {
    return (
      <div className="auth-shell">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to={isAuthenticated ? '/setup' : '/login'} aria-label="PrepPressure home">
          <span className="brand-mark">P</span>
          <span>
            <strong>PrepPressure</strong>
            <small>Interview practice</small>
          </span>
        </NavLink>

        <div className="nav-label">Workspace</div>
        <nav className="main-nav" aria-label="Main navigation">
          {isAuthenticated && navigation.map(({ label, path }) => (
            <NavLink
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              key={path}
              to={path}
              end={path !== '/interviews/1/take'}
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

        {isAuthenticated && (
          <div className="sidebar-footer">
            <div className="nav-user">{user?.displayName ?? 'User'}</div>
            <button className="secondary-button" onClick={logout} type="button">
              Logout
            </button>
          </div>
        )}
      </aside>

      <div className="app-content">
        <header className="topbar">
          <span className="breadcrumb">Your workspace <span>/</span> Practice</span>
          <span className="status-pill"><span /> {isAuthenticated ? 'Interview prep' : 'Signed out'}</span>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default App
