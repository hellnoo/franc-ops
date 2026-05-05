-- ============================================================
-- Hall-U Café QR Menu — Supabase Setup
-- Run this in your Supabase project's SQL Editor
-- ============================================================

-- New tables (existing tables are untouched)
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price int not null,
  category text,
  available boolean default true,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  table_number int not null,
  items jsonb not null,
  status text default 'new',
  note text,
  created_at timestamptz default now()
);

-- Enable Realtime for instant order updates on /kasir
alter publication supabase_realtime add table orders;

-- Seed data — Hall-U Café menu
insert into menu_items (name, description, price, category, available) values
  -- Kopi
  ('Americano',           'Espresso dengan air panas, bold dan bersih',                    18000, 'Kopi',     true),
  ('Latte',               'Espresso dengan susu steamed creamy',                           22000, 'Kopi',     true),
  ('V60 Single Origin',   'Manual brew pour-over, tergantung bean hari ini',               28000, 'Kopi',     true),
  ('Kopi Susu Aren',      'Espresso dengan gula aren dan susu segar',                      20000, 'Kopi',     true),
  -- Non-Kopi
  ('Matcha Latte',        'Matcha Jepang premium dengan susu oat',                         22000, 'Non-Kopi', true),
  ('Coklat Panas',        'Dark chocolate blend, rich dan tidak terlalu manis',            18000, 'Non-Kopi', true),
  ('Es Teh Tarik',        'Teh dengan susu kental manis, segar dan gurih',                 15000, 'Non-Kopi', true),
  -- Makanan
  ('Roti Bakar Keju',     'Roti brioche panggang dengan keju mozarella meleleh',           15000, 'Makanan',  true),
  ('Croissant',           'Croissant butter flaky, disajikan hangat',                      18000, 'Makanan',  true),
  ('Pasta Aglio Olio',    'Spaghetti dengan bawang putih, cabai, olive oil, dan parsley',  35000, 'Makanan',  true);
