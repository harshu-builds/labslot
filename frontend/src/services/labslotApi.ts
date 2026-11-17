import { clientAuth } from '../firebase/firebaseClient'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export const isLabSlotApiEnabled = Boolean(API_BASE_URL)

type ApiEnvelope<T> = { success: boolean; message?: string } & T

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  if (!API_BASE_URL) throw new Error('VITE_API_BASE_URL is not configured.')
  const firebaseUser = clientAuth.currentUser
  if (!firebaseUser) throw new Error('Please sign in to continue.')
  const token = await firebaseUser.getIdToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.success) {
    if (response.status === 401) throw new Error('Your session expired. Please sign in again.')
    if (response.status === 403) throw new Error('You do not have permission to perform this action.')
    throw new Error(data.message || `Request failed (${response.status})`)
  }
  return data as ApiEnvelope<T>
}

export type EquipmentRecord = {
  id: string; name: string; category: string; description?: string; imageUrl?: string
  location?: string; quantity?: number; status: 'available' | 'limited' | 'unavailable' | 'maintenance'
}

export type StudentRecord = {
  uid: string; name: string; email: string; department?: string; rollNumber?: string
  year?: number | null; phone?: string; createdAt?: unknown
}

export const labslotApi = {
  listEquipment: () => apiRequest<{ equipment: EquipmentRecord[] }>('/api/equipment'),
  createEquipment: (record: Omit<EquipmentRecord, 'id'>) =>
    apiRequest<{ equipment: EquipmentRecord }>('/api/equipment', { method: 'POST', body: JSON.stringify(record) }),
  updateEquipment: (id: string, record: Partial<EquipmentRecord>) =>
    apiRequest<{ equipment: EquipmentRecord }>(`/api/equipment/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(record) }),
  deleteEquipment: (id: string) =>
    apiRequest<{ id: string }>(`/api/equipment/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listStudents: () => apiRequest<{ students: StudentRecord[] }>('/api/students'),
  updateStudent: (id: string, record: Partial<Pick<StudentRecord, 'name' | 'department' | 'rollNumber' | 'year' | 'phone'>>) =>
    apiRequest<{ student: StudentRecord }>(`/api/students/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(record) }),
}
