
-- =========================================
-- ENUMS
-- =========================================
create type public.app_role as enum ('admin', 'user');
create type public.kyc_status as enum ('not_started', 'pending', 'verified', 'rejected');
create type public.account_type as enum ('current', 'savings', 'crypto');
create type public.account_currency as enum ('EUR', 'GBP', 'USD', 'CHF', 'PLN');
create type public.tx_direction as enum ('credit', 'debit');
create type public.tx_status as enum ('pending', 'completed', 'failed');
create type public.transfer_network as enum ('internal', 'sepa', 'sepa_instant', 'swift');

-- =========================================
-- TIMESTAMP TRIGGER FN
-- =========================================
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================
-- PROFILES
-- =========================================
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  date_of_birth date,
  country text,
  city text,
  address_line text,
  postal_code text,
  kyc_status public.kyc_status not null default 'not_started',
  two_fa_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = user_id);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- =========================================
-- USER ROLES (separate, anti-recursion pattern)
-- =========================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create policy "roles_select_own" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

-- =========================================
-- KYC VERIFICATIONS
-- =========================================
create table public.kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text,
  document_number text,
  document_country text,
  selfie_taken boolean not null default false,
  address_line text,
  city text,
  postal_code text,
  country text,
  status public.kyc_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.kyc_verifications enable row level security;

create policy "kyc_select_own" on public.kyc_verifications
  for select to authenticated using (auth.uid() = user_id);
create policy "kyc_insert_own" on public.kyc_verifications
  for insert to authenticated with check (auth.uid() = user_id);
create policy "kyc_update_own" on public.kyc_verifications
  for update to authenticated using (auth.uid() = user_id);

create trigger kyc_set_updated_at before update on public.kyc_verifications
  for each row execute function public.update_updated_at_column();

-- =========================================
-- ACCOUNTS
-- =========================================
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.account_type not null default 'current',
  currency public.account_currency not null default 'EUR',
  iban text,
  balance_cents bigint not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.accounts enable row level security;

create policy "accounts_select_own" on public.accounts
  for select to authenticated using (auth.uid() = user_id);
create policy "accounts_insert_own" on public.accounts
  for insert to authenticated with check (auth.uid() = user_id);
create policy "accounts_update_own" on public.accounts
  for update to authenticated using (auth.uid() = user_id);

create index accounts_user_idx on public.accounts(user_id);
create trigger accounts_set_updated_at before update on public.accounts
  for each row execute function public.update_updated_at_column();

-- =========================================
-- RECIPIENTS (address book)
-- =========================================
create table public.recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  iban text,
  swift_bic text,
  bank_name text,
  country text,
  currency public.account_currency not null default 'EUR',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.recipients enable row level security;

create policy "recipients_select_own" on public.recipients
  for select to authenticated using (auth.uid() = user_id);
create policy "recipients_insert_own" on public.recipients
  for insert to authenticated with check (auth.uid() = user_id);
create policy "recipients_update_own" on public.recipients
  for update to authenticated using (auth.uid() = user_id);
create policy "recipients_delete_own" on public.recipients
  for delete to authenticated using (auth.uid() = user_id);

create trigger recipients_set_updated_at before update on public.recipients
  for each row execute function public.update_updated_at_column();

-- =========================================
-- TRANSACTIONS
-- =========================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  direction public.tx_direction not null,
  amount_cents bigint not null check (amount_cents >= 0),
  currency public.account_currency not null,
  description text not null,
  category text,
  counterparty_name text,
  counterparty_iban text,
  counterparty_swift text,
  network public.transfer_network,
  fx_rate numeric(18,8),
  fee_cents bigint not null default 0,
  status public.tx_status not null default 'completed',
  reference text,
  created_at timestamptz not null default now()
);
alter table public.transactions enable row level security;

create policy "tx_select_own" on public.transactions
  for select to authenticated using (auth.uid() = user_id);
create policy "tx_insert_own" on public.transactions
  for insert to authenticated with check (auth.uid() = user_id);

create index tx_user_created_idx on public.transactions(user_id, created_at desc);
create index tx_account_idx on public.transactions(account_id);

-- =========================================
-- CRYPTO HOLDINGS
-- =========================================
create table public.crypto_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  name text not null,
  amount numeric(36, 18) not null default 0,
  avg_buy_price_eur numeric(18, 4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, symbol)
);
alter table public.crypto_holdings enable row level security;

create policy "crypto_select_own" on public.crypto_holdings
  for select to authenticated using (auth.uid() = user_id);
create policy "crypto_insert_own" on public.crypto_holdings
  for insert to authenticated with check (auth.uid() = user_id);
create policy "crypto_update_own" on public.crypto_holdings
  for update to authenticated using (auth.uid() = user_id);
create policy "crypto_delete_own" on public.crypto_holdings
  for delete to authenticated using (auth.uid() = user_id);

create trigger crypto_set_updated_at before update on public.crypto_holdings
  for each row execute function public.update_updated_at_column();

-- =========================================
-- HANDLE NEW USER: create profile + EUR primary account + role + welcome tx
-- =========================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_account_id uuid;
  iban_suffix text := lpad(floor(random()*1000000000)::text, 14, '0');
begin
  insert into public.profiles (user_id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  );

  insert into public.user_roles (user_id, role) values (new.id, 'user');

  insert into public.accounts (user_id, name, type, currency, iban, balance_cents, is_primary)
  values (new.id, 'Main account', 'current', 'EUR', 'DE89' || iban_suffix, 250000, true)
  returning id into new_account_id;

  insert into public.transactions (user_id, account_id, direction, amount_cents, currency, description, category, network, status)
  values (new.id, new_account_id, 'credit', 250000, 'EUR', 'Welcome bonus', 'Bonus', 'internal', 'completed');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
