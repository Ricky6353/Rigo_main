-- Catalog tables (run in Supabase SQL Editor if not using full schema.sql)
-- Safe to re-run: uses IF NOT EXISTS

create table if not exists public.categories (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

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

create table if not exists public.product_reviews (
  id bigint generated always as identity primary key,
  product_id text not null references public.products (id) on delete cascade,
  author_name text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null,
  created_at timestamptz not null default now()
);

create index if not exists product_reviews_product_id_idx on public.product_reviews (product_id);

create table if not exists public.gallery_items (
  id bigint generated always as identity primary key,
  url text not null,
  storage_path text not null,
  mime_type text,
  sort_order integer default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_reviews enable row level security;
alter table public.gallery_items enable row level security;

drop policy if exists "categories_select_public" on public.categories;
create policy "categories_select_public" on public.categories for select using (true);

drop policy if exists "products_select_public" on public.products;
create policy "products_select_public" on public.products for select using (true);

drop policy if exists "product_reviews_select_public" on public.product_reviews;
create policy "product_reviews_select_public" on public.product_reviews for select using (true);

drop policy if exists "gallery_items_select_public" on public.gallery_items;
create policy "gallery_items_select_public" on public.gallery_items for select using (true);

insert into storage.buckets (id, name, public)
values
  ('products', 'products', true),
  ('gallery', 'gallery', true)
on conflict (id) do update set public = excluded.public;
