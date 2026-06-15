-- franc-ops: Sistem Pantau Kasir Franchise Hallu
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('owner', 'mitra', 'kasir')),
  created_at timestamptz default now()
);
alter table profiles enable row level security;

-- OUTLETS
create table outlets (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  address text,
  mitra_id uuid references profiles(id) on delete set null,
  active boolean default true,
  created_at timestamptz default now()
);
alter table outlets enable row level security;

-- OUTLET_KASIR (kasir belongs to outlet)
create table outlet_kasir (
  outlet_id uuid references outlets(id) on delete cascade,
  kasir_id uuid references profiles(id) on delete cascade,
  primary key (outlet_id, kasir_id)
);
alter table outlet_kasir enable row level security;

-- MENU ITEMS
create table menu_items (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  price integer not null,
  hpp integer not null default 0,
  category text,
  active boolean default true,
  created_at timestamptz default now()
);
alter table menu_items enable row level security;

-- TRANSACTIONS
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  outlet_id uuid references outlets(id) on delete cascade not null,
  kasir_id uuid references profiles(id) on delete set null,
  total integer not null default 0,
  created_at timestamptz default now()
);
alter table transactions enable row level security;

-- TRANSACTION ITEMS
create table transaction_items (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references transactions(id) on delete cascade not null,
  menu_item_id uuid references menu_items(id) on delete set null,
  menu_name text not null,
  price integer not null,
  hpp integer not null default 0,
  qty integer not null default 1
);
alter table transaction_items enable row level security;

-- HELPER: ambil role user via SECURITY DEFINER (bypass RLS, hindari rekursi)
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- RLS POLICIES

-- profiles: user bisa baca profil sendiri, owner bisa baca semua
create policy "users can read own profile" on profiles
  for select using (auth.uid() = id);

create policy "owner can read all profiles" on profiles
  for select using (public.get_my_role() = 'owner');

create policy "owner can insert profiles" on profiles
  for insert with check (public.get_my_role() = 'owner');

-- outlets: owner lihat semua, mitra lihat outlet mereka
create policy "owner sees all outlets" on outlets
  for all using (public.get_my_role() = 'owner');

create policy "mitra sees own outlets" on outlets
  for select using (mitra_id = auth.uid());

create policy "kasir sees assigned outlet" on outlets
  for select using (
    exists (select 1 from outlet_kasir where outlet_id = outlets.id and kasir_id = auth.uid())
  );

-- transactions: kasir insert, mitra & owner baca
create policy "kasir can insert transactions" on transactions
  for insert with check (
    exists (select 1 from outlet_kasir where outlet_id = transactions.outlet_id and kasir_id = auth.uid())
  );

create policy "kasir sees own outlet transactions" on transactions
  for select using (
    exists (select 1 from outlet_kasir where outlet_id = transactions.outlet_id and kasir_id = auth.uid())
  );

create policy "mitra sees own outlet transactions" on transactions
  for select using (
    exists (select 1 from outlets where id = transactions.outlet_id and mitra_id = auth.uid())
  );

create policy "owner sees all transactions" on transactions
  for select using (public.get_my_role() = 'owner');

-- transaction_items
create policy "anyone can insert transaction items" on transaction_items
  for insert with check (true);

create policy "read transaction items via transaction access" on transaction_items
  for select using (
    exists (
      select 1 from transactions t
      join outlets o on o.id = t.outlet_id
      where t.id = transaction_items.transaction_id
      and (
        o.mitra_id = auth.uid()
        or exists (select 1 from outlet_kasir where outlet_id = o.id and kasir_id = auth.uid())
        or public.get_my_role() = 'owner'
      )
    )
  );

-- menu_items: semua bisa baca, owner bisa edit
create policy "all can read menu items" on menu_items
  for select using (true);

create policy "owner manages menu items" on menu_items
  for all using (public.get_my_role() = 'owner');

-- outlet_kasir
create policy "owner manages outlet kasir" on outlet_kasir
  for all using (public.get_my_role() = 'owner');

create policy "kasir sees own assignment" on outlet_kasir
  for select using (kasir_id = auth.uid());

-- TRIGGER: auto insert profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'kasir')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
