-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Creates tables + storage buckets for users, orders, and customizations.

-- USERS (admin + customer login)
create table if not exists public.users (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null unique,
  password text,
  role text not null default 'user' check (role in ('admin', 'user')),
  image text,
  auth_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);

-- ORDERS
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  order_id text not null unique,
  order_date timestamptz not null default now(),
  customer_name text,
  contact text,
  phone_number text,
  email text,
  address text,
  city text,
  postal_code text,
  items jsonb default '[]'::jsonb,
  item_count integer default 0,
  total numeric default 0,
  payment_method text,
  transaction_id text,
  stripe_session_id text,
  stripe_payment_intent_id text,
  status text default 'paid',
  source text default 'web',
  customization_link text,
  customization_instructions text,
  created_at timestamptz not null default now()
);

create index if not exists orders_order_id_idx on public.orders (order_id);
create index if not exists orders_email_idx on public.orders (email);

-- CATEGORIES
create table if not exists public.categories (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

-- PRODUCTS
create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  price numeric not null default 0,
  description text not null default '',
  sizes jsonb default '[]'::jsonb,
  details jsonb default '[]'::jsonb,
  image text not null default '',
  images jsonb default '[]'::jsonb,
  sold_out boolean default false,
  sold_out_sizes jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);

-- PRODUCT REVIEWS
create table if not exists public.product_reviews (
  id bigint generated always as identity primary key,
  product_id text not null references public.products (id) on delete cascade,
  author_name text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null,
  created_at timestamptz not null default now()
);

create index if not exists product_reviews_product_id_idx on public.product_reviews (product_id);

-- GALLERY
create table if not exists public.gallery_items (
  id bigint generated always as identity primary key,
  url text not null,
  storage_path text not null,
  mime_type text,
  sort_order integer default 0,
  created_at timestamptz not null default now()
);

-- CUSTOMIZATION FILE METADATA
create table if not exists public.customization_files (
  id bigint generated always as identity primary key,
  file_id text not null unique,
  file_name text not null,
  mime_type text,
  size bigint,
  path text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Row Level Security (server uses service role; anon client needs read on orders)
alter table public.users enable row level security;
alter table public.orders enable row level security;
alter table public.customization_files enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_reviews enable row level security;
alter table public.gallery_items enable row level security;

-- Service role bypasses RLS. Allow API routes using anon key to read orders by email.
drop policy if exists "orders_select_public" on public.orders;
create policy "orders_select_public" on public.orders for select using (true);

drop policy if exists "customization_files_select_public" on public.customization_files;
create policy "customization_files_select_public" on public.customization_files for select using (true);

drop policy if exists "categories_select_public" on public.categories;
create policy "categories_select_public" on public.categories for select using (true);

drop policy if exists "products_select_public" on public.products;
create policy "products_select_public" on public.products for select using (true);

drop policy if exists "product_reviews_select_public" on public.product_reviews;
create policy "product_reviews_select_public" on public.product_reviews for select using (true);

drop policy if exists "gallery_items_select_public" on public.gallery_items;
create policy "gallery_items_select_public" on public.gallery_items for select using (true);

-- Users: no public access (login only via server / service role)
drop policy if exists "users_no_public" on public.users;
create policy "users_no_public" on public.users for select using (false);

-- Storage buckets (public read for file links)
insert into storage.buckets (id, name, public)
values
  ('users', 'users', true),
  ('orders', 'orders', true),
  ('customizations', 'customizations', true),
  ('products', 'products', true),
  ('gallery', 'gallery', true)
on conflict (id) do update set public = excluded.public;
