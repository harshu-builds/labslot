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
  id: string
  name: string
  category: string
  description?: string
  imageUrl?: string
  location?: string
  quantity?: number
  status: 'available' | 'limited' | 'unavailable' | 'maintenance'
}

export type StudentRecord = {
  uid: string
  name: string
  email: string
  department?: string
  rollNumber?: string
  year?: number | null
  phone?: string
  createdAt?: unknown
}

export type BookingStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Completed'

export type BookingRecord = {
  id: string
  studentUid?: string
  studentId?: string
  student?: string
  studentName?: string
  email?: string
  studentEmail?: string
  equipmentId: string
  equipmentName?: string
  date: string
  time?: string
  timeSlot?: string
  purpose: string
  details?: string
  status: BookingStatus
  adminNote?: string
  createdAt?: string | null
  updatedAt?: string
}

export type CreateBookingPayload = {
  equipmentId: string
  date: string
  time?: string
  timeSlot?: string
  purpose: string
  details?: string
  studentName?: string
  studentEmail?: string
}

export type SlotAvailabilityResponse = {
  bookable: boolean
  equipmentStatus: string
  bookedSlots: string[]
}

export const labslotApi = {
  listEquipment: () => apiRequest<{ equipment: EquipmentRecord[] }>('/api/equipment'),
  createEquipment: (record: Omit<EquipmentRecord, 'id'>) =>
    apiRequest<{ equipment: EquipmentRecord }>('/api/equipment', { method: 'POST', body: JSON.stringify(record) }),
  updateEquipment: (id: string, record: Partial<EquipmentRecord>) =>
    apiRequest<{ equipment: EquipmentRecord }>(`/api/equipment/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(record),
    }),
  deleteEquipment: (id: string) =>
    apiRequest<{ id: string }>(`/api/equipment/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  listStudents: () => apiRequest<{ students: StudentRecord[] }>('/api/students'),
  getMyStudent: () => apiRequest<{ student: StudentRecord }>('/api/students/me'),
  updateMyStudent: (record: Partial<Pick<StudentRecord, 'name' | 'department' | 'rollNumber' | 'year' | 'phone'>>) =>
    apiRequest<{ student: StudentRecord }>('/api/students/me', { method: 'PUT', body: JSON.stringify(record) }),
  updateStudent: (
    id: string,
    record: Partial<Pick<StudentRecord, 'name' | 'department' | 'rollNumber' | 'year' | 'phone'>>,
  ) =>
    apiRequest<{ student: StudentRecord }>(`/api/students/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...record,
        ...(record.rollNumber !== undefined ? { rollNumber: record.rollNumber.trim() } : {}),
      }),
    }),

  // Booking endpoints
  listBookings: (params?: { role?: 'admin' | 'student'; status?: string; equipmentId?: string; scope?: 'mine' | 'all' }) => {
    const basePath = params?.role === 'student' || params?.scope === 'mine' ? '/api/bookings/mine' : '/api/bookings'
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.equipmentId) query.set('equipmentId', params.equipmentId)
    const qs = query.toString()
    return apiRequest<{ bookings: BookingRecord[] }>(`${basePath}${qs ? `?${qs}` : ''}`)
  },

  checkAvailability: (equipmentId: string, date: string) => {
    const query = new URLSearchParams({ equipmentId, date })
    return apiRequest<SlotAvailabilityResponse>(`/api/bookings/availability?${query.toString()}`)
  },

  createBooking: (payload: CreateBookingPayload) =>
    apiRequest<{ booking: BookingRecord }>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        time: payload.time ?? payload.timeSlot,
        timeSlot: payload.timeSlot ?? payload.time,
      }),
    }),

  updateBookingStatus: (id: string, status: BookingStatus) =>
    apiRequest<{ booking: BookingRecord }>(`/api/bookings/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  cancelBooking: (id: string) =>
    apiRequest<{ booking: BookingRecord }>(`/api/bookings/${encodeURIComponent(id)}/cancel`, {
      method: 'PATCH',
    }),

  cancelMyBooking: (id: string) =>
    apiRequest<{ booking: BookingRecord }>(`/api/bookings/${encodeURIComponent(id)}/cancel`, {
      method: 'PATCH',
    }),

  approveBooking: (id: string, adminNote = '') =>
    apiRequest<{ booking: BookingRecord }>(`/api/bookings/${encodeURIComponent(id)}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ adminNote }),
    }),

  rejectBooking: (id: string, adminNote = '') =>
    apiRequest<{ booking: BookingRecord }>(`/api/bookings/${encodeURIComponent(id)}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ adminNote }),
    }),
}