'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { initialAdminProfile, initialBookings, initialEquipment, initialStudents, timeRangesOverlap } from './data'
import type { AdminProfile, Booking, Equipment, Student } from './data'
import { isLabSlotApiEnabled, labslotApi, type EquipmentRecord, type StudentRecord } from '../../src/services/labslotApi'

type StoreValue = {
  equipment: Equipment[]
  bookings: Booking[]
  students: Student[]
  adminProfile: AdminProfile
  apiEnabled: boolean
  dataLoading: boolean
  dataError: string | null
  refreshRemoteData: (includeStudents?: boolean) => Promise<void>
  addBooking: (booking: Omit<Booking, 'id' | 'status'>) => { ok: boolean; message: string }
  updateBooking: (id: string, status: Booking['status']) => void
  cancelBooking: (id: string) => void
  saveEquipment: (equipment: Equipment) => Promise<void>
  removeEquipment: (id: string) => Promise<void>
  updateStudentProfile: (id: string, fields: { name: string; department: string; rollNumber?: string }) => Promise<void>
  registerStudent: (student: { name: string; email: string }) => void
  saveAdminProfile: (profile: AdminProfile) => void
}

const Store = createContext<StoreValue | null>(null)
const STORAGE_KEY = 'labslot-demo-v1'
type SavedState = { equipment?: Equipment[]; bookings?: Booking[]; students?: Student[]; adminProfile?: AdminProfile }

function readSavedState(): SavedState | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) as SavedState : null
  } catch { return null }
}

function imageForEquipment(record: EquipmentRecord) {
  const match = initialEquipment.find((item) => item.name.toLowerCase() === record.name.toLowerCase())
  return match?.image ?? record.imageUrl ?? '/equipment/lab-workbench.png'
}
function fromEquipmentRecord(record: EquipmentRecord): Equipment {
  const status = record.status === 'maintenance' ? 'Maintenance' : record.status === 'limited' ? 'Limited' : record.status === 'unavailable' ? 'Unavailable' : 'Available'
  return {
    id: record.id, name: record.name, category: record.category, status, quantity: record.quantity ?? 1,
    image: imageForEquipment(record), description: record.description ?? '',
    location: record.location ?? '',
  }
}
function toEquipmentRecord(item: Equipment): Omit<EquipmentRecord, 'id'> {
  return {
    name: item.name, category: item.category, description: item.description,
    imageUrl: item.image, location: item.location, quantity: item.quantity ?? 1,
    status: item.status === 'Maintenance' ? 'maintenance' : item.status === 'Limited' ? 'limited' : item.status === 'Unavailable' ? 'unavailable' : 'available',
  }
}
function fromStudentRecord(record: StudentRecord): Student {
  const created = record.createdAt && typeof record.createdAt === 'object' && '_seconds' in (record.createdAt as object)
    ? new Date(Number((record.createdAt as { _seconds: number })._seconds) * 1000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  return {
    id: record.uid, name: record.name, email: record.email,
    department: record.department || 'Not assigned',
    program: record.rollNumber ? `Roll no. ${record.rollNumber}` : 'Not assigned',
    joinedAt: created,
  }
}

export function LabSlotProvider({ children }: { children: React.ReactNode }) {
  const [savedState] = useState(readSavedState)
  const [equipment, setEquipment] = useState<Equipment[]>(() => savedState?.equipment?.map((item) => {
    const defaultItem = initialEquipment.find((entry) => entry.id === item.id)
    return defaultItem ? { ...item, image: defaultItem.image } : item
  }) ?? initialEquipment)
  const [bookings, setBookings] = useState(() => savedState?.bookings ?? initialBookings)
  const [students, setStudents] = useState(() => savedState?.students ?? initialStudents)
  const [adminProfile, setAdminProfile] = useState(() => savedState?.adminProfile ?? initialAdminProfile)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ bookings, adminProfile, ...(isLabSlotApiEnabled ? {} : { equipment, students }) }))
  }, [equipment, bookings, students, adminProfile])

  const refreshRemoteData = useCallback(async (includeStudents = false) => {
    if (!isLabSlotApiEnabled) return
    setDataLoading(true)
    setDataError(null)
    try {
      const equipmentResult = await labslotApi.listEquipment()
      setEquipment(equipmentResult.equipment.map(fromEquipmentRecord))
      if (includeStudents) {
        const studentResult = await labslotApi.listStudents()
        setStudents(studentResult.students.map(fromStudentRecord))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load LabSlot data.'
      setDataError(message)
      throw error
    } finally {
      setDataLoading(false)
    }
  }, [])

  const addBooking = useCallback((booking: Omit<Booking, 'id' | 'status'>) => {
    const item = equipment.find((entry) => entry.id === booking.equipmentId)
    if (!item || item.status !== 'Available') return { ok: false, message: 'This equipment is not available for booking.' }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (new Date(`${booking.date}T00:00:00`) < today) return { ok: false, message: 'Choose a date in the future.' }
    const conflict = bookings.some((existing) => existing.equipmentId === booking.equipmentId && existing.date === booking.date && timeRangesOverlap(existing.time, booking.time) && ['Pending', 'Approved'].includes(existing.status))
    if (conflict) return { ok: false, message: 'That time slot was just reserved. Choose another slot.' }
    setBookings((current) => [{ ...booking, id: `LS-${Math.floor(2000 + Math.random() * 7000)}`, status: 'Pending' }, ...current])
    return { ok: true, message: 'Your request is on its way to the lab administrator.' }
  }, [bookings, equipment])

  const updateBooking = useCallback((id: string, status: Booking['status']) => setBookings((current) => current.map((booking) => booking.id === id ? { ...booking, status } : booking)), [])
  const cancelBooking = useCallback((id: string) => setBookings((current) => current.map((booking) => booking.id === id && booking.status === 'Pending' ? { ...booking, status: 'Cancelled' } : booking)), [])

  const saveEquipment = useCallback(async (item: Equipment) => {
    if (isLabSlotApiEnabled) {
      const payload = toEquipmentRecord(item)
      if (item.id.startsWith('new-')) {
        const result = await labslotApi.createEquipment(payload)
        setEquipment((current) => [...current, fromEquipmentRecord(result.equipment)])
      } else {
        const result = await labslotApi.updateEquipment(item.id, payload)
        setEquipment((current) => current.map((entry) => entry.id === item.id ? fromEquipmentRecord(result.equipment) : entry))
      }
      return
    }
    setEquipment((current) => current.some((entry) => entry.id === item.id) ? current.map((entry) => entry.id === item.id ? item : entry) : [...current, item])
  }, [])

  const removeEquipment = useCallback(async (id: string) => {
    if (isLabSlotApiEnabled && !id.startsWith('eq-')) await labslotApi.deleteEquipment(id)
    setEquipment((current) => current.filter((item) => item.id !== id))
  }, [])

  const updateStudentProfile = useCallback(async (id: string, fields: { name: string; department: string; rollNumber?: string }) => {
    if (!isLabSlotApiEnabled) {
      setStudents((current) => current.map((student) => student.id === id ? {
        ...student, name: fields.name, department: fields.department,
        program: fields.rollNumber ? `Roll no. ${fields.rollNumber}` : student.program,
      } : student))
      return
    }
    const result = await labslotApi.updateStudent(id, fields)
    setStudents((current) => current.map((student) => student.id === id ? fromStudentRecord(result.student) : student))
  }, [])

  const registerStudent = useCallback(({ name, email }: { name: string; email: string }) => {
    setStudents((current) => current.some((student) => student.email.toLowerCase() === email.toLowerCase()) ? current : [...current, {
      id: `ST-${Date.now()}`, name: name.trim(), email: email.trim(),
      department: 'Not assigned', program: 'Not assigned', joinedAt: new Date().toISOString().slice(0, 10),
    }])
  }, [])
  const saveAdminProfile = useCallback((profile: AdminProfile) => setAdminProfile(profile), [])
  const value = useMemo(() => ({
    equipment, bookings, students, adminProfile, apiEnabled: isLabSlotApiEnabled,
    dataLoading, dataError, refreshRemoteData, addBooking, updateBooking, cancelBooking,
    saveEquipment, removeEquipment, updateStudentProfile, registerStudent, saveAdminProfile,
  }), [equipment, bookings, students, adminProfile, dataLoading, dataError, refreshRemoteData, addBooking, updateBooking, cancelBooking, saveEquipment, removeEquipment, updateStudentProfile, registerStudent, saveAdminProfile])

  return <Store.Provider value={value}>{children}</Store.Provider>
}

export function useLabSlot() {
  const value = useContext(Store)
  if (!value) throw new Error('useLabSlot must be used inside LabSlotProvider')
  return value
}
