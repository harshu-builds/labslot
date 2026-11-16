
import {
    signInWithEmailAndPassword,
    signOut,
  } from 'firebase/auth'
  import { clientAuth } from '../firebase/firebaseClient'

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

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
    user?: UserProfile
  }

  function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    return 'Something went wrong. Please try again.'
  }

  async function getBackendProfile(): Promise<UserProfile> {
    const firebaseUser = clientAuth.currentUser

    if (!firebaseUser) {
      throw new Error('You are not signed in.')
    }

    const token = await firebaseUser.getIdToken()

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data: AuthResponse = await response.json()

    if (!response.ok || !data.success || !data.user) {
      throw new Error(data.message || 'Unable to retrieve your account profile.')
    }

    return data.user
  }

  // STUDENT REGISTRATION
  export async function registerStudent(details: {
    name: string
    email: string
    password: string
    department: string
    rollNumber: string
  }): Promise<UserProfile> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(details),
      })

      const data: AuthResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Student registration failed.')
      }

      // The backend creates the account.
      // Firebase Client SDK signs the student in afterwards.
      await signInWithEmailAndPassword(
        clientAuth,
        details.email,
        details.password,
      )

      return await getBackendProfile()
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  // LOGIN
  export async function loginUser(
    email: string,
    password: string,
  ): Promise<UserProfile> {
    try {
      await signInWithEmailAndPassword(clientAuth, email, password)

      return await getBackendProfile()
    } catch (error) {
      // Do not leave a partially authenticated session behind.
      if (clientAuth.currentUser) {
        await signOut(clientAuth)
      }

      throw new Error(getErrorMessage(error))
    }
  }

  // LOGOUT
  export async function logoutUser(): Promise<void> {
    await signOut(clientAuth)
  }

  // RESTORE CURRENT USER PROFILE
  export async function fetchCurrentUser(): Promise<UserProfile> {
    return getBackendProfile()
  }
