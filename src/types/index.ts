export type HppComponent = { nama: string; biaya: number }

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
  created_at: string
}
