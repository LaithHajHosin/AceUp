import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export interface AuthUser {
  id: number
  username: string
  email: string
  displayName: string
  bio: string
}

interface StoredUser extends AuthUser {
  password: string
}

interface LoginPayload {
  identifier: string
  password: string
}

interface RegisterPayload {
  username: string
  email: string
  password: string
  displayName: string
  bio?: string
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
  updateProfile: (changes: Pick<AuthUser, 'displayName' | 'bio'>) => void
}

const AUTH_STORAGE_KEY = 'preppressure:auth'
const USERS_STORAGE_KEY = 'preppressure:users'
const LOGOUT_EVENT = 'preppressure:logout'

const DEMO_USER: StoredUser = {
  id: 1,
  username: 'demo',
  email: 'demo@preppressure.dev',
  displayName: 'Demo user',
  bio: 'Practice-focused learner',
  password: 'demo123',
}

function readUsers(): StoredUser[] {
  const raw = localStorage.getItem(USERS_STORAGE_KEY)
  if (!raw) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([DEMO_USER]))
    return [DEMO_USER]
  }

  try {
    const parsed = JSON.parse(raw) as StoredUser[]
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
  } catch {
    // ignore malformed local data and reset to seed values
  }

  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([DEMO_USER]))
  return [DEMO_USER]
}

function readAuthState() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return { token: null, user: null }

  try {
    const parsed = JSON.parse(raw) as { token: string | null; user: AuthUser | null }
    return parsed
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return { token: null, user: null }
  }
}

function persistAuth(token: string | null, user: AuthUser | null) {
  if (token && user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }))
    return
  }

  localStorage.removeItem(AUTH_STORAGE_KEY)
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readAuthState().token)
  const [user, setUser] = useState<AuthUser | null>(() => readAuthState().user)

  useEffect(() => {
    persistAuth(token, user)
  }, [token, user])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === AUTH_STORAGE_KEY) {
        const nextState = readAuthState()
        setToken(nextState.token)
        setUser(nextState.user)
      }
      if (event.key === USERS_STORAGE_KEY) {
        const nextState = readAuthState()
        setUser(nextState.user)
      }
    }

    const onLogout = () => {
      setToken(null)
      setUser(null)
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener(LOGOUT_EVENT, onLogout)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(LOGOUT_EVENT, onLogout)
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: Boolean(token && user),
    logout: () => {
      setToken(null)
      setUser(null)
      persistAuth(null, null)
      window.dispatchEvent(new Event(LOGOUT_EVENT))
    },
    login: async ({ identifier, password }) => {
      const normalizedIdentifier = identifier.trim().toLowerCase()
      const users = readUsers()
      const found = users.find(
        (candidate) =>
          candidate.username.toLowerCase() === normalizedIdentifier ||
          candidate.email.toLowerCase() === normalizedIdentifier,
      )

      if (!found || found.password !== password) {
        throw new Error('INVALID_CREDENTIALS')
      }

      const nextUser: AuthUser = {
        id: found.id,
        username: found.username,
        email: found.email,
        displayName: found.displayName,
        bio: found.bio,
      }

      const nextToken = `mock-token-${found.id}`
      setToken(nextToken)
      setUser(nextUser)
      persistAuth(nextToken, nextUser)
    },
    register: async ({ username, email, password, displayName, bio = '' }) => {
      const sanitizedUsername = username.trim()
      const sanitizedEmail = email.trim().toLowerCase()
      const sanitizedDisplayName = displayName.trim()

      if (!sanitizedUsername || !sanitizedEmail || !password || !sanitizedDisplayName) {
        throw new Error('VALIDATION_ERROR')
      }

      const users = readUsers()
      if (users.some((candidate) => candidate.username.toLowerCase() === sanitizedUsername.toLowerCase())) {
        throw new Error('USERNAME_TAKEN')
      }
      if (users.some((candidate) => candidate.email.toLowerCase() === sanitizedEmail)) {
        throw new Error('EMAIL_TAKEN')
      }

      const nextUser: StoredUser = {
        id: users.length ? Math.max(...users.map((candidate) => candidate.id)) + 1 : 1,
        username: sanitizedUsername,
        email: sanitizedEmail,
        displayName: sanitizedDisplayName,
        bio,
        password,
      }

      users.push(nextUser)
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))

      const authUser: AuthUser = {
        id: nextUser.id,
        username: nextUser.username,
        email: nextUser.email,
        displayName: nextUser.displayName,
        bio: nextUser.bio,
      }
      const nextToken = `mock-token-${nextUser.id}`
      setToken(nextToken)
      setUser(authUser)
      persistAuth(nextToken, authUser)
    },
    updateProfile: (changes) => {
      if (!user) return

      const nextUser: AuthUser = {
        ...user,
        ...changes,
      }

      setUser(nextUser)
      persistAuth(token, nextUser)

      const users = readUsers()
      const updated = users.map((candidate) =>
        candidate.id === user.id ? { ...candidate, ...changes } : candidate,
      )
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated))
    },
  }), [token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
