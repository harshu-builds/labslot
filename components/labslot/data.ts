export type EquipmentStatus = 'Available' | 'Limited' | 'Maintenance'
export type BookingStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Completed'

export type Equipment = {
  id: string
  name: string
  category: string
  status: EquipmentStatus
  image: string
  description: string
  location: string
}

export type Booking = {
  id: string
  student: string
  email: string
  equipmentId: string
  date: string
  time: string
  purpose: string
  status: BookingStatus
}

const dateOffset = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export const initialEquipment: Equipment[] = [
  { id: 'eq-01', name: 'Microscope', category: 'Biology', status: 'Available', image: 'https://images.unsplash.com/photo-1579154341098-e4e158cc7f55?auto=format&fit=crop&w=900&q=85', description: 'Olympus CX23 compound microscope with 4×, 10×, 40× and 100× objectives.', location: 'Biology Lab · Lab B' },
  { id: 'eq-02', name: 'Oscilloscope', category: 'Electronics', status: 'Available', image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=85', description: 'Digital oscilloscope for signal analysis, circuit diagnostics, and waveform measurement.', location: 'Electronics Lab · Lab A' },
  { id: 'eq-03', name: 'Centrifuge', category: 'Biotechnology', status: 'Limited', image: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=900&q=85', description: 'Refrigerated benchtop centrifuge with programmable speed and temperature control.', location: 'Biotechnology Lab · Lab C' },
  { id: 'eq-04', name: 'Spectrophotometer', category: 'Chemistry', status: 'Available', image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=85', description: 'UV-visible spectrophotometer for precise absorbance and concentration measurements.', location: 'Chemistry Lab · Lab D' },
  { id: 'eq-05', name: 'Digital Multimeter', category: 'Electronics', status: 'Available', image: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=900&q=85', description: 'True RMS digital multimeter with voltage, current, resistance, and continuity modes.', location: 'Electronics Lab · Lab A' },
  { id: 'eq-06', name: '3D Printer', category: 'Rapid Prototyping', status: 'Maintenance', image: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=900&q=85', description: 'FDM printer with a 220 × 220 mm build volume for rapid prototyping projects.', location: 'Innovation Lab · Lab E' },
]

export const initialBookings: Booking[] = [
  { id: 'LS-2048', student: 'Harshita Gupta', email: 'harshita@university.edu', equipmentId: 'eq-01', date: dateOffset(2), time: '10:00 AM – 12:00 PM', purpose: 'Cell observation', status: 'Approved' },
  { id: 'LS-2047', student: 'Harshita Gupta', email: 'harshita@university.edu', equipmentId: 'eq-02', date: dateOffset(5), time: '02:00 PM – 04:00 PM', purpose: 'Signal analysis', status: 'Pending' },
  { id: 'LS-2046', student: 'Riya Sharma', email: 'riya@university.edu', equipmentId: 'eq-01', date: dateOffset(2), time: '12:00 PM – 02:00 PM', purpose: 'Cell observation', status: 'Pending' },
  { id: 'LS-2045', student: 'Aditi Verma', email: 'aditi@university.edu', equipmentId: 'eq-02', date: dateOffset(3), time: '02:00 PM – 04:00 PM', purpose: 'Circuit analysis', status: 'Pending' },
  { id: 'LS-2044', student: 'Neha Gupta', email: 'neha@university.edu', equipmentId: 'eq-03', date: dateOffset(-3), time: '09:00 AM – 11:00 AM', purpose: 'Sample preparation', status: 'Completed' },
  { id: 'LS-2043', student: 'Harshita Gupta', email: 'harshita@university.edu', equipmentId: 'eq-04', date: dateOffset(-10), time: '11:00 AM – 01:00 PM', purpose: 'Absorbance testing', status: 'Rejected' },
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
