import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { clientAuth } from '../firebase/firebaseClient'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '')

export interface UserProfile {
  uid: string
  name: string
  email: string
  department?: string
  rollNumber?: string
  role: 'student' | 'admin'
}

interface AuthResponse {
  success: boolean
  message?: string
  code?: string
  user?: UserProfile
}

function getApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error('LabSlot API is not configured. Set VITE_API_BASE_URL in Vercel and redeploy the frontend.')
  }
  try {
    new URL(API_BASE_URL)
  } catch {
    throw new Error('VITE_API_BASE_URL is invalid. Check the Render backend URL in Vercel.')
  }
  return API_BASE_URL
}

async function readApiResponse(response: Response): Promise<AuthResponse> {
  const text = await response.text()
  let data: AuthResponse
  try {
    data = JSON.parse(text) as AuthResponse
  } catch {
    throw new Error(`LabSlot server returned an invalid response (HTTP ${response.status}). Check the Render backend deployment.`)
  }
  if (!response.ok || !data.success) {
    throw new Error(data.message || `LabSlot request failed (HTTP ${response.status}).`)
  }
  return data
}

async function getBackendProfile(): Promise<UserProfile> {
  const firebaseUser = clientAuth.currentUser
  if (!firebaseUser) throw new Error('You are not signed in.')

  const token = await firebaseUser.getIdToken()
  const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await readApiResponse(response)
  if (!data.user) throw new Error('The server did not return your account profile.')
  return data.user
}

export async function registerStudent(details: {
  name: string
  email: string
  password: string
  department: string
  rollNumber: string
}): Promise<UserProfile> {
  const email = details.email.trim().toLowerCase()
  const response = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...details, name: details.name.trim(), email, department: details.department.trim(), rollNumber: details.rollNumber.trim() }),
  })
  await readApiResponse(response)

  try {
    await signInWithEmailAndPassword(clientAuth, email, details.password)
    return await getBackendProfile()
  } catch (error) {
    if (clientAuth.currentUser) await signOut(clientAuth)
    throw new Error(error instanceof Error ? error.message : 'Account was created, but automatic sign-in failed. Please sign in manually.')
  }
}

export async function loginUser(email: string, password: string): Promise<UserProfile> {
  try {
    await signInWithEmailAndPassword(clientAuth, email.trim().toLowerCase(), password)
    return await getBackendProfile()
  } catch (error) {
    if (clientAuth.currentUser) await signOut(clientAuth)
    throw new Error(error instanceof Error ? error.message : 'Sign in failed.')
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(clientAuth)
}

export async function fetchCurrentUser(): Promise<UserProfile> {
  return getBackendProfile()
}
