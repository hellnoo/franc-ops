# Hall-U Coffee & Sociality — QR Menu Ordering System

Sistem pemesanan kafe berbasis QR code untuk Hall-U Coffee & Sociality (Ternate).
Customer scan QR di meja → pesan dari HP → realtime ke kasir.

## Fitur

**Customer (`/menu?table=N`)**
- Browse menu dengan kategori (Kopi, Non-Kopi, Makanan, Lainnya)
- 3D product showcase modal dengan atmosfer per kategori
- Cart persist di localStorage, order persist 3 jam
- Rating bintang setelah selesai
- 💬 AI Barista chatbot
- ✨ Rekomendasi cerdas saat di cart

**Kasir (`/kasir`)**
- Realtime order masuk + bunyi notif berulang
- Flow: Diterima → Disiapkan → Siap → Selesai
- Input manual, struk WA ke customer
- Wake Lock (layar tidak mati)
- Tutup Kasir → Smart Daily Report ke WA owner

**Admin (`/admin`)**
- Kelola menu + upload foto (auto-compress)
- Kalkulator HPP per komponen
- ✨ Auto-generate deskripsi (AI)
- Analitik: revenue chart, jam ramai, top item
- 🧠 Menu Engineering AI (BCG matrix)
- Pengaturan jam buka/tutup
- CSV export + cleanup data lama

## Tech Stack

- Next.js 15 (App Router)
- Supabase (Postgres + Realtime + Storage)
- Tailwind CSS
- Anthropic Claude (5 fitur AI)
- Web Push (VAPID)
- PWA-ready

## Setup

1. Buat `.env.local`, isi:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMIN_PASSWORD`
   - `KASIR_PASSWORD`
   - `ANTHROPIC_API_KEY` (untuk fitur AI)
   - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (untuk Web Push)

2. Jalankan `supabase-setup.sql` di Supabase SQL Editor

3. `npm install && npm run dev`
