
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
  } from 'react'
  import { onAuthStateChanged } from 'firebase/auth'
  import { clientAuth } from '../firebase/firebaseClient'
  import {
    fetchCurrentUser,
    type UserProfile,
  } from '../services/authService'

  interface AuthContextType {
    user: UserProfile | null
    loading: boolean
    error: string | null
    refreshProfile: () => Promise<void>
  }

  const AuthContext = createContext<AuthContextType | undefined>(undefined)

  export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const requestId = useRef(0)

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(clientAuth, async (firebaseUser) => {
        const currentRequest = ++requestId.current

        if (!firebaseUser) {
          setUser(null)
          setError(null)
          setLoading(false)
          return
        }

        setLoading(true)
        setError(null)

        try {
          const profile = await fetchCurrentUser()

          if (currentRequest === requestId.current) {
            setUser(profile)
          }
        } catch (err) {
          if (currentRequest === requestId.current) {
            setUser(null)
            setError(
              err instanceof Error
                ? err.message
                : 'Unable to load your account.',
            )
          }
        } finally {
          if (currentRequest === requestId.current) {
            setLoading(false)
          }
        }
      })

      return () => {
        requestId.current++
        unsubscribe()
      }
    }, [])

    const refreshProfile = useCallback(async () => {
      try {
        const profile = await fetchCurrentUser()
        setUser(profile)
        setError(null)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to refresh your profile.'

        setError(message)
        throw err
      }
    }, [])

    return (
      <AuthContext.Provider
        value={{ user, loading, error, refreshProfile }}
      >
        {children}
      </AuthContext.Provider>
    )
  }

  export function useAuth() {
    const context = useContext(AuthContext)

    if (!context) {
      throw new Error('useAuth must be used inside an AuthProvider.')
    }

    return context
  }
