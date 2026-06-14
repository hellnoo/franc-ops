export type Role = 'owner' | 'mitra' | 'kasir'

export interface Profile {
  id: string
  full_name: string
  role: Role
  created_at: string
}

export interface Outlet {
  id: string
  name: string
  address: string | null
  mitra_id: string | null
  active: boolean
  created_at: string
  profiles?: Profile
}

export interface MenuItem {
  id: string
  name: string
  price: number
  hpp: number
  category: string | null
  active: boolean
}

export interface Transaction {
  id: string
  outlet_id: string
  kasir_id: string | null
  total: number
  created_at: string
  outlets?: Outlet
  profiles?: Profile
  transaction_items?: TransactionItem[]
}

export interface TransactionItem {
  id: string
  transaction_id: string
  menu_item_id: string | null
  menu_name: string
  price: number
  hpp: number
  qty: number
}

export interface DailySummary {
  date: string
  outlet_id: string
  omzet: number
  hpp: number
  profit: number
  transaction_count: number
}
