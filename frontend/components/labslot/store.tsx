'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { initialAdminProfile, initialEquipment, initialStudents } from './data'
import type { AdminProfile, Booking, Equipment, Student } from './data'
import {
  isLabSlotApiEnabled,
  labslotApi,
  type BookingRecord,
  type EquipmentRecord,
  type StudentRecord,
} from '../../src/services/labslotApi'

type StoreValue = {
  equipment: Equipment[]
  bookings: Booking[]
  students: Student[]
  adminProfile: AdminProfile
  apiEnabled: boolean
  dataLoading: boolean
  dataError: string | null
  refreshRemoteData: (includeStudents?: boolean, role?: 'student' | 'admin') => Promise<void>
  addBooking: (booking: Omit<Booking, 'id' | 'status'> & { details?: string }) => Promise<{ ok: boolean; message: string }>
  updateBooking: (id: string, status: Booking['status']) => Promise<void>
  cancelBooking: (id: string) => Promise<void>
  saveEquipment: (equipment: Equipment) => Promise<void>
  removeEquipment: (id: string) => Promise<void>
  updateStudentProfile: (
    id: string,
    fields: { name: string; department: string; rollNumber?: string; year?: number | null; phone?: string },
  ) => Promise<void>
  registerStudent: (student: { name: string; email: string }) => void
  saveAdminProfile: (profile: AdminProfile) => void
}

const Store = createContext<StoreValue | null>(null)
const STORAGE_KEY = 'labslot-demo-v1'
type SavedState = { equipment?: Equipment[]; bookings?: Booking[]; students?: Student[]; adminProfile?: AdminProfile }

function readSavedState(): SavedState | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as SavedState) : null
  } catch {
    return null
  }
}

function imageForEquipment(record: EquipmentRecord) {
  const match = initialEquipment.find((item) => item.name.toLowerCase() === record.name.toLowerCase())
  return match?.image ?? record.imageUrl ?? '/equipment/lab-workbench.png'
}

function fromEquipmentRecord(record: EquipmentRecord): Equipment {
  const status =
    record.status === 'maintenance'
      ? 'Maintenance'
      : record.status === 'limited'
        ? 'Limited'
        : record.status === 'unavailable'
          ? 'Unavailable'
          : 'Available'
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    status,
    quantity: record.quantity ?? 1,
    image: imageForEquipment(record),
    description: record.description ?? '',
    location: record.location ?? '',
  }
}

function toEquipmentRecord(item: Equipment): Omit<EquipmentRecord, 'id'> {
  return {
    name: item.name,
    category: item.category,
    description: item.description,
    imageUrl: item.image,
    location: item.location,
    quantity: item.quantity ?? 1,
    status:
      item.status === 'Maintenance'
        ? 'maintenance'
        : item.status === 'Limited'
          ? 'limited'
          : item.status === 'Unavailable'
            ? 'unavailable'
            : 'available',
  }
}

function fromStudentRecord(record: StudentRecord): Student {
  const created =
    record.createdAt && typeof record.createdAt === 'object' && '_seconds' in (record.createdAt as object)
      ? new Date(Number((record.createdAt as { _seconds: number })._seconds) * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  return {
    id: record.uid,
    name: record.name,
    email: record.email,
    department: record.department || 'Not assigned',
    program: record.rollNumber ? `Roll no. ${record.rollNumber}` : 'Not assigned',
    joinedAt: created,
    year: record.year ?? null,
    phone: record.phone ?? '',
  }
}

function fromBookingRecord(record: BookingRecord): Booking {
  return {
    id: record.id,
    student: record.studentName || record.student || 'Student',
    email: record.studentEmail || record.email || '',
    equipmentId: record.equipmentId,
    date: record.date,
    time: record.timeSlot || record.time || '',
    purpose: record.purpose || '',
    status: record.status,
  }
}

function isBookableEquipmentStatus(status: Equipment['status']) {
  return status !== 'Maintenance' && status !== 'Unavailable'
}

export function LabSlotProvider({ children }: { children: React.ReactNode }) {
  const [savedState] = useState(readSavedState)
  const [equipment, setEquipment] = useState<Equipment[]>(() => {
    if (isLabSlotApiEnabled) return []
    return (
      savedState?.equipment?.map((item) => {
        const defaultItem = initialEquipment.find((entry) => entry.id === item.id)
        return defaultItem ? { ...item, image: defaultItem.image } : item
      }) ?? initialEquipment
    )
  })
  const [bookings, setBookings] = useState<Booking[]>([])
  const [students, setStudents] = useState<Student[]>(() =>
    isLabSlotApiEnabled ? [] : (savedState?.students ?? initialStudents),
  )
  const [adminProfile, setAdminProfile] = useState<AdminProfile>(() => savedState?.adminProfile ?? initialAdminProfile)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        adminProfile,
        ...(isLabSlotApiEnabled ? {} : { equipment, bookings, students }),
      }),
    )
  }, [equipment, bookings, students, adminProfile])

  const refreshRemoteData = useCallback(
    async (includeStudents = false, role: 'student' | 'admin' = 'student') => {
      if (!isLabSlotApiEnabled) return
      setDataLoading(true)
      setDataError(null)
      try {
        const [equipmentResult, bookingResult] = await Promise.all([
          labslotApi.listEquipment(),
          labslotApi.listBookings({ role }),
        ])
        setEquipment(equipmentResult.equipment.map(fromEquipmentRecord))
        setBookings(bookingResult.bookings.map(fromBookingRecord))
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
    },
    [],
  )

  const addBooking = useCallback(
    async (booking: Omit<Booking, 'id' | 'status'> & { details?: string }) => {
      const item = equipment.find((entry) => entry.id === booking.equipmentId)
      if (!item || !isBookableEquipmentStatus(item.status)) {
        return { ok: false, message: 'This equipment is unavailable or under maintenance.' }
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (new Date(`${booking.date}T00:00:00`) < today) {
        return { ok: false, message: 'Choose a date in the future.' }
      }

      const conflict = bookings.some(
  (existing) =>
    existing.equipmentId === booking.equipmentId &&
    existing.date === booking.date &&
    existing.time === booking.time &&
    ['Pending', 'Approved'].includes(existing.status),
)
      if (conflict) {
        return { ok: false, message: 'That time slot was just reserved. Choose another slot.' }
      }

      if (!isLabSlotApiEnabled) {
        const newBooking: Booking = {
          ...booking,
          id: `LS-${Math.floor(2000 + Math.random() * 7000)}`,
          status: 'Pending',
        }
        setBookings((current) => [newBooking, ...current])
        return { ok: true, message: 'Your request is on its way to the lab administrator.' }
      }

      try {
        const result = await labslotApi.createBooking({
          equipmentId: booking.equipmentId,
          date: booking.date,
          time: booking.time,
          timeSlot: booking.time,
          purpose: booking.purpose,
          details: booking.details,
          studentName: booking.student,
          studentEmail: booking.email,
        })
        const created = fromBookingRecord(result.booking)
        setBookings((current) => [created, ...current])
        return { ok: true, message: result.message || 'Your request is on its way to the lab administrator.' }
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : 'Unable to submit booking.' }
      }
    },
    [bookings, equipment],
  )

  const updateBooking = useCallback(async (id: string, status: Booking['status']) => {
    if (!isLabSlotApiEnabled) {
      setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, status } : booking)))
      return
    }
    const result = await labslotApi.updateBookingStatus(id, status)
    const updated = fromBookingRecord(result.booking)
    setBookings((current) => current.map((booking) => (booking.id === id ? updated : booking)))
  }, [])

  const cancelBooking = useCallback(async (id: string) => {
    if (!isLabSlotApiEnabled) {
      setBookings((current) =>
        current.map((booking) =>
          booking.id === id && ['Pending', 'Approved'].includes(booking.status)
            ? { ...booking, status: 'Cancelled' }
            : booking,
        ),
      )
      return
    }
    const result = await labslotApi.cancelMyBooking(id)
    const updated = fromBookingRecord(result.booking)
    setBookings((current) => current.map((booking) => (booking.id === id ? updated : booking)))
  }, [])

  const saveEquipment = useCallback(async (item: Equipment) => {
    if (isLabSlotApiEnabled) {
      const payload = toEquipmentRecord(item)
      if (item.id.startsWith('new-')) {
        const result = await labslotApi.createEquipment(payload)
        setEquipment((current) => [...current, fromEquipmentRecord(result.equipment)])
      } else {
        const result = await labslotApi.updateEquipment(item.id, payload)
        setEquipment((current) =>
          current.map((entry) => (entry.id === item.id ? fromEquipmentRecord(result.equipment) : entry)),
        )
      }
      return
    }
    setEquipment((current) =>
      current.some((entry) => entry.id === item.id)
        ? current.map((entry) => (entry.id === item.id ? item : entry))
        : [...current, item],
    )
  }, [])

  const removeEquipment = useCallback(async (id: string) => {
    if (isLabSlotApiEnabled) await labslotApi.deleteEquipment(id)
    setEquipment((current) => current.filter((item) => item.id !== id))
  }, [])

  const updateStudentProfile = useCallback(
    async (
      id: string,
      fields: { name: string; department: string; rollNumber?: string; year?: number | null; phone?: string },
    ) => {
      if (!isLabSlotApiEnabled) {
        setStudents((current) =>
          current.map((student) =>
            student.id === id
              ? {
                  ...student,
                  name: fields.name,
                  department: fields.department,
                  program: fields.rollNumber ? `Roll no. ${fields.rollNumber}` : 'Not assigned',
                  year: fields.year ?? null,
                  phone: fields.phone ?? '',
                }
              : student,
          ),
        )
        return
      }
      const result = await labslotApi.updateStudent(id, fields)
      setStudents((current) => current.map((student) => (student.id === id ? fromStudentRecord(result.student) : student)))
    },
    [],
  )

  const registerStudent = useCallback(({ name, email }: { name: string; email: string }) => {
    setStudents((current) =>
      current.some((student) => student.email.toLowerCase() === email.toLowerCase())
        ? current
        : [
            ...current,
            {
              id: `ST-${Date.now()}`,
              name: name.trim(),
              email: email.trim(),
              department: 'Not assigned',
              program: 'Not assigned',
              joinedAt: new Date().toISOString().slice(0, 10),
            },
          ],
    )
  }, [])

  const saveAdminProfile = useCallback((profile: AdminProfile) => setAdminProfile(profile), [])

  const value = useMemo(
    () => ({
      equipment,
      bookings,
      students,
      adminProfile,
      apiEnabled: isLabSlotApiEnabled,
      dataLoading,
      dataError,
      refreshRemoteData,
      addBooking,
      updateBooking,
      cancelBooking,
      saveEquipment,
      removeEquipment,
      updateStudentProfile,
      registerStudent,
      saveAdminProfile,
    }),
    [
      equipment,
      bookings,
      students,
      adminProfile,
      dataLoading,
      dataError,
      refreshRemoteData,
      addBooking,
      updateBooking,
      cancelBooking,
      saveEquipment,
      removeEquipment,
      updateStudentProfile,
      registerStudent,
      saveAdminProfile,
    ],
  )

  return <Store.Provider value={value}>{children}</Store.Provider>
}

export function useLabSlot() {
  const value = useContext(Store)
  if (!value) throw new Error('useLabSlot must be used inside LabSlotProvider')
  return value
}