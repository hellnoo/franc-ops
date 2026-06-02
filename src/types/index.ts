export type HppComponent = { nama: string; biaya: number }

export type Shift = {
  id: string
  employee_name: string
  started_at: string
  ended_at: string | null
  opening_notes: string | null
  closing_notes: string | null
  handover_to: string | null
}

export const EMPLOYEES = ['Amin', 'Rama', 'Ubuy'] as const
export type EmployeeName = typeof EMPLOYEES[number]

export type StoreSettings = {
  id: number
  open_time: string        // "08:00"
  close_time: string       // "22:00"
  open_days: string        // "Senin – Minggu"
  is_manually_closed: boolean
}

export type MenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  hpp: number
  hpp_components: HppComponent[]
  category: string
  available: boolean
  image_url: string | null
  model_3d_url: string | null
  model_3d_task_id: string | null
  created_at: string
}

export type OrderItem = {
  id: string
  name: string
  price: number
  qty: number
}

export type Order = {
  id: string
  table_number: number
  items: OrderItem[]
  status: 'new' | 'preparing' | 'ready' | 'done' | 'cancelled'
  note: string | null
  customer_name: string | null
  phone: string | null
  payment_method: string | null
  rating: number | null
  created_at: string
}
