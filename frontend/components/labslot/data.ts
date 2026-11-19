export type EquipmentStatus = 'Available' | 'Limited' | 'Unavailable' | 'Maintenance'
export type BookingStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Completed'

export type Equipment = {
  id: string
  name: string
  category: string
  status: EquipmentStatus
  quantity?: number
  image: string
  description: string
  location: string
}

export type Booking = {
  id: string
  student: string
  email: string
  studentUid?: string
  equipmentName?: string
  details?: string
  equipmentId: string
  date: string
  time: string
  purpose: string
  status: BookingStatus
}

export type Student = {
  id: string
  name: string
  email: string
  department: string
  program: string
  joinedAt: string
  year?: number | null
  phone?: string
}

export type AdminProfile = {
  name: string
  email: string
  department: string
}

export const initialStudents: Student[] = [
  { id: 'ST-1001', name: 'Harshita Gupta', email: 'harshita@university.edu', department: 'Biological Sciences', program: 'Molecular Biology', joinedAt: '2024-09-03' },
  { id: 'ST-1002', name: 'Riya Sharma', email: 'riya@university.edu', department: 'Biological Sciences', program: 'Cell Biology', joinedAt: '2024-09-12' },
  { id: 'ST-1003', name: 'Aditi Verma', email: 'aditi@university.edu', department: 'Engineering', program: 'Electrical Engineering', joinedAt: '2024-10-02' },
  { id: 'ST-1004', name: 'Neha Gupta', email: 'neha@university.edu', department: 'Biotechnology', program: 'Biotechnology', joinedAt: '2024-10-17' },
  { id: 'ST-1005', name: 'Kabir Mehta', email: 'kabir@university.edu', department: 'Engineering', program: 'Mechanical Engineering', joinedAt: '2024-11-08' },
]

export const initialAdminProfile: AdminProfile = {
  name: 'Lab Administrator',
  email: 'admin@labslot.edu',
  department: 'Laboratory Services',
}

export const initialEquipment: Equipment[] = [
  { id: 'eq-01', name: 'Microscope', category: 'Biology', status: 'Available', image: '/equipment/microscope.png', description: 'Olympus CX23 compound microscope with 4×, 10×, 40× and 100× objectives.', location: 'Biology Lab · Lab B' },
  { id: 'eq-02', name: 'Oscilloscope', category: 'Electronics', status: 'Available', image: '/equipment/oscilloscope.png', description: 'Digital oscilloscope for signal analysis, circuit diagnostics, and waveform measurement.', location: 'Electronics Lab · Lab A' },
  { id: 'eq-03', name: 'Centrifuge', category: 'Biotechnology', status: 'Limited', image: '/equipment/centrifuge.png', description: 'Refrigerated benchtop centrifuge with programmable speed and temperature control.', location: 'Biotechnology Lab · Lab C' },
  { id: 'eq-04', name: 'Spectrophotometer', category: 'Chemistry', status: 'Available', image: '/equipment/spectrophotometer.png', description: 'UV-visible spectrophotometer for precise absorbance and concentration measurements.', location: 'Chemistry Lab · Lab D' },
  { id: 'eq-05', name: 'Digital Multimeter', category: 'Electronics', status: 'Available', image: '/equipment/multimeter.png', description: 'True RMS digital multimeter with voltage, current, resistance, and continuity modes.', location: 'Electronics Lab · Lab A' },
  { id: 'eq-06', name: '3D Printer', category: 'Rapid Prototyping', status: 'Maintenance', image: '/equipment/3d-printer.png', description: 'FDM printer with a 220 × 220 mm build volume for rapid prototyping projects.', location: 'Innovation Lab · Lab E' },
]

export const getEquipmentName = (equipment: Equipment[], id: string) => equipment.find((item) => item.id === id)?.name ?? 'Removed equipment'
export const formatDate = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`))

function timeToMinutes(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return null
  let hours = Number(match[1]) % 12
  if (match[3].toUpperCase() === 'PM') hours += 12
  return hours * 60 + Number(match[2])
}

export function timeRangesOverlap(first: string, second: string) {
  const firstParts = first.split('–')
  const secondParts = second.split('–')
  if (firstParts.length !== 2 || secondParts.length !== 2) return first === second
  const [firstStart, firstEnd] = firstParts.map(timeToMinutes)
  const [secondStart, secondEnd] = secondParts.map(timeToMinutes)
  if ([firstStart, firstEnd, secondStart, secondEnd].some((value) => value === null)) return first === second
  return firstStart! < secondEnd! && secondStart! < firstEnd!
}
