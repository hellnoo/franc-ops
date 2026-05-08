export type MenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  available: boolean
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
  status: 'new' | 'done'
  note: string | null
  customer_name: string | null
  phone: string | null
  payment_method: string | null
  created_at: string
}
