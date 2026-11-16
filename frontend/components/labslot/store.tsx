'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { initialAdminProfile, initialBookings, initialEquipment, initialStudents, timeRangesOverlap } from './data'
import type { AdminProfile, Booking, Equipment, Student } from './data'

type StoreValue = {
  equipment: Equipment[]
  bookings: Booking[]
  students: Student[]
  adminProfile: AdminProfile
  addBooking: (booking: Omit<Booking, 'id' | 'status'>) => { ok: boolean; message: string }
  updateBooking: (id: string, status: Booking['status']) => void
  cancelBooking: (id: string) => void
  saveEquipment: (equipment: Equipment) => void
  removeEquipment: (id: string) => void
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
  } catch {
    return null
  }
}

export function LabSlotProvider({ children }: { children: React.ReactNode }) {
  const [savedState] = useState(readSavedState)
  const [equipment, setEquipment] = useState(() => savedState?.equipment?.map((item) => {
    const defaultItem = initialEquipment.find((entry) => entry.id === item.id)
    return defaultItem ? { ...item, image: defaultItem.image } : item
  }) ?? initialEquipment)
  const [bookings, setBookings] = useState(() => savedState?.bookings ?? initialBookings)
  const [students, setStudents] = useState(() => savedState?.students ?? initialStudents)
  const [adminProfile, setAdminProfile] = useState(() => savedState?.adminProfile ?? initialAdminProfile)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ equipment, bookings, students, adminProfile }))
  }, [equipment, bookings, students, adminProfile])

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
  const saveEquipment = useCallback((item: Equipment) => setEquipment((current) => current.some((entry) => entry.id === item.id) ? current.map((entry) => entry.id === item.id ? item : entry) : [...current, item]), [])
  const removeEquipment = useCallback((id: string) => setEquipment((current) => current.filter((item) => item.id !== id)), [])
  const registerStudent = useCallback(({ name, email }: { name: string; email: string }) => {
    setStudents((current) => current.some((student) => student.email.toLowerCase() === email.toLowerCase()) ? current : [...current, {
      id: `ST-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      department: 'Not assigned',
      program: 'Not assigned',
      joinedAt: new Date().toISOString().slice(0, 10),
    }])
  }, [])
  const saveAdminProfile = useCallback((profile: AdminProfile) => setAdminProfile(profile), [])
  const value = useMemo(() => ({ equipment, bookings, students, adminProfile, addBooking, updateBooking, cancelBooking, saveEquipment, removeEquipment, registerStudent, saveAdminProfile }), [equipment, bookings, students, adminProfile, addBooking, updateBooking, cancelBooking, saveEquipment, removeEquipment, registerStudent, saveAdminProfile])

  return <Store.Provider value={value}>{children}</Store.Provider>
}

export function useLabSlot() {
  const value = useContext(Store)
  if (!value) throw new Error('useLabSlot must be used inside LabSlotProvider')
  return value
}
