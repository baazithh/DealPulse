-- DealPulse schema
-- Run this in your Supabase SQL editor or CLI

create table if not exists product_cache (
  asin                 text        primary key,
  title                text,
  image                text,
  price_inr            numeric,
  yesterday_price_inr  numeric,
  tomorrow_price_inr   numeric,
  delta                numeric,
  signal               text,
  stock_pct            int,
  product_url          text,
  raw_availability     text,
  inr_rate             numeric,
  fetched_at           timestamptz not null default now()
);

create table if not exists price_history (
  id          bigserial   primary key,
  asin        text        not null,
  price_inr   numeric     not null,
  stock_pct   int         not null default 50,
  recorded_at timestamptz not null default now()
);

create index if not exists price_history_asin_recorded
  on price_history(asin, recorded_at desc);

-- Row Level Security (public read-only; writes via service role key only)
alter table product_cache  enable row level security;
alter table price_history  enable row level security;

create policy "public read cache"
  on product_cache for select using (true);

create policy "public read history"
  on price_history for select using (true);
