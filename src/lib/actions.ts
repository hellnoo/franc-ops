'use server'

import { createClient, createAdminClient } from './supabase-server'
import { revalidatePath } from 'next/cache'

async function getOwner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak terautentikasi')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'owner') throw new Error('Hanya owner yang boleh')
  return user
}

export async function createUser(formData: FormData) {
  await getOwner()
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))
  const full_name = String(formData.get('full_name'))
  const role = String(formData.get('role')) // 'mitra' | 'kasir'
  const outlet_id = formData.get('outlet_id') ? String(formData.get('outlet_id')) : null

  const admin = await createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })
  if (error) return { error: error.message }

  const userId = data.user.id

  // Pastikan profile benar (trigger mungkin sudah buat, upsert untuk amankan role)
  await admin.from('profiles').upsert({ id: userId, full_name, role }, { onConflict: 'id' })

  // Assign kasir ke outlet jika dipilih
  if (role === 'kasir' && outlet_id) {
    await admin.from('outlet_kasir').insert({ outlet_id, kasir_id: userId })
  }

  revalidatePath('/owner/users')
  return { success: true }
}

export async function createOutlet(formData: FormData) {
  await getOwner()
  const name = String(formData.get('name'))
  const address = formData.get('address') ? String(formData.get('address')) : null
  const mitra_id = formData.get('mitra_id') ? String(formData.get('mitra_id')) : null

  const admin = await createAdminClient()
  const { error } = await admin.from('outlets').insert({ name, address, mitra_id })
  if (error) return { error: error.message }

  revalidatePath('/owner')
  revalidatePath('/owner/outlets/new')
  return { success: true }
}

export async function createMenuItem(formData: FormData) {
  await getOwner()
  const name = String(formData.get('name'))
  const price = parseInt(String(formData.get('price')), 10) || 0
  const hpp = parseInt(String(formData.get('hpp')), 10) || 0
  const category = formData.get('category') ? String(formData.get('category')) : null

  const admin = await createAdminClient()
  const { error } = await admin.from('menu_items').insert({ name, price, hpp, category })
  if (error) return { error: error.message }

  revalidatePath('/owner/menu')
  return { success: true }
}

export async function updateMenuHpp(id: string, hpp: number, price: number) {
  await getOwner()
  const admin = await createAdminClient()
  const { error } = await admin.from('menu_items').update({ hpp, price }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/owner/menu')
  return { success: true }
}

export async function deleteMenuItem(id: string) {
  await getOwner()
  const admin = await createAdminClient()
  await admin.from('menu_items').update({ active: false }).eq('id', id)
  revalidatePath('/owner/menu')
  return { success: true }
}
