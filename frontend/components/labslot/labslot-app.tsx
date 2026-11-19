
import { useCallback, useEffect, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { useLabSlot } from './store'
import {
  Brand,
  LandingPage,
  LoginScreen,
  RegistrationScreen,
  RoleSelection,
} from './landing'
import { PortalShell } from './portal-shell'
import {
  AdminStudentsPage,
  AssistantPage,
  BookingsPage,
  BookingPage,
  DashboardPage,
  EquipmentPage,
  ProfilePage,
} from './portal-pages'

import { useAuth } from '../../src/context/AuthContext'
import {
  loginUser,
  logoutUser,
  registerStudent as createStudentAccount,
} from '../../src/services/authService'

function LabSlotRouter() {
  const location = useLocation()
  const routerNavigate = useNavigate()

  const path = location.pathname + location.search
  const cleanPath = location.pathname

  const { user, loading, refreshProfile } = useAuth()
  const { registerStudent: addStudentToStore, refreshRemoteData } = useLabSlot()

  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!user) return
    refreshRemoteData(user.role === 'admin', user.role).catch((error) => {
      console.error('LabSlot data sync failed:', error)
      setToast(error instanceof Error ? error.message : 'Unable to sync LabSlot data.')
    })
  }, [user?.uid, user?.role, refreshRemoteData])

  const navigate = useCallback(
    (next: string) => {
      routerNavigate(next)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [routerNavigate],
  )

  const notify = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }, [])

  // LOGIN
  const signIn = async (
    email: string,
    password: string,
    requestedRole: 'student' | 'admin',
  ) => {
    const profile = await loginUser(email, password)

    // The backend profile, not the selected login screen,
    // determines the user's actual permissions.
    if (profile.role !== requestedRole) {
      await logoutUser()

      throw new Error(
        `This account is registered as ${profile.role}. Please use the ${profile.role} login.`,
      )
    }

    await refreshProfile()

    navigate(`/${profile.role}/dashboard`)
    notify(`Welcome to your ${profile.role} portal.`)
  }

  // LOGOUT
  const logout = async () => {
    try {
      await logoutUser()
      navigate('/')
      notify('You have been signed out.')
    } catch {
      notify('Unable to sign out. Please try again.')
    }
  }

  // STUDENT REGISTRATION
  const register = async (details: {
    name: string
    email: string
    password: string
    department: string
    rollNumber: string
  }) => {
    const profile = await createStudentAccount(details)

    // Keep the existing local demo store in sync for now.
    addStudentToStore({
      name: profile.name,
      email: profile.email,
    })

    await refreshProfile()

    navigate('/student/dashboard')
    notify(`Welcome to LabSlot, ${profile.name.split(' ')[0]}.`)
  }

  // PUBLIC PAGES
  if (cleanPath === '/') {
    return (
      <>
        <LandingPage navigate={navigate} />
        {toast && <div className="toast-message">{toast}</div>}
      </>
    )
  }

  if (cleanPath === '/get-started' || cleanPath === '/roles') {
    return (
      <>
        <RoleSelection navigate={navigate} />
        {toast && <div className="toast-message">{toast}</div>}
      </>
    )
  }

  if (cleanPath === '/login') {
    const requestedRole =
      new URLSearchParams(location.search).get('role') === 'admin'
        ? 'admin'
        : 'student'

    if (user && !loading) {
      return <Navigate to={`/${user.role}/dashboard`} replace />
    }

    return (
      <>
        <LoginScreen
          navigate={navigate}
          role={requestedRole}
          onLogin={signIn}
        />
        {toast && <div className="toast-message">{toast}</div>}
      </>
    )
  }

  if (cleanPath === '/register') {
    return <RegistrationScreen navigate={navigate} onRegister={register} />
  }

  // PROTECTED PORTAL ROUTES
  const isAdmin = cleanPath.startsWith('/admin')
  const routeRole = isAdmin ? 'admin' : 'student'

  if (loading) {
    return (
      <main className="auth-page">
        <div className="auth-shell">
          <Brand />
          <p>Checking your account...</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return <Navigate to={`/login?role=${routeRole}`} replace />
  }

  if (user.role !== routeRole) {
    return <Navigate to={`/${user.role}/dashboard`} replace />
  }

  // PORTAL PAGES
  const screen = cleanPath.split('/')[2] ?? 'dashboard'

  let page

  if (screen === 'dashboard') {
    page = (
      <DashboardPage
        role={routeRole}
        navigate={navigate}
        notify={notify}
        userName={user.name}
      />
    )
  } else if (screen === 'equipment') {
    page = (
      <EquipmentPage
        role={routeRole}
        navigate={navigate}
        notify={notify}
      />
    )
  } else if (screen === 'book') {
    page = (
      <BookingPage
        navigate={navigate}
        notify={notify}
        search={location.search.slice(1)}
      />
    )
  } else if (screen === 'requests') {
    page = <BookingsPage role={routeRole} requestsOnly notify={notify} />
  } else if (screen === 'bookings' || screen === 'reservations') {
    page = <BookingsPage role={routeRole} notify={notify} />
  } else if (screen === 'history') {
    page = <BookingsPage role={routeRole} historyOnly notify={notify} />
  } else if (screen === 'assistant') {
    page = <AssistantPage notify={notify} />
  } else if (screen === 'students') {
    page = <AdminStudentsPage />
  } else if (screen === 'profile') {
    page = <ProfilePage role={routeRole} notify={notify} userName={user.name} userEmail={user.email} />
  } else {
    page = (
      <DashboardPage
        role={routeRole}
        navigate={navigate}
        notify={notify}
        userName={user.name}
      />
    )
  }

  return (
    <>
      <PortalShell
        role={routeRole}
        path={path}
        navigate={navigate}
        onLogout={logout}
        userName={user.name}
      >
        {page}
      </PortalShell>

      {toast && (
        <div className="toast-message">
          <span className="toast-check">✓</span>
          {toast}
        </div>
      )}
    </>
  )
}

export function LabSlotApp() {
  return (
    <BrowserRouter>
      <LabSlotRouter />
    </BrowserRouter>
  )
}
