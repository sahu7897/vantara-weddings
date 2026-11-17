-- Username/password-only super-admin credentials. Never readable from PostgREST
-- clients: authentication is performed by server-only API routes with service_role.
create table if not exists public.admin_access_credentials (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username = lower(username) and length(username) between 8 and 48),
  password_salt text not null,
  password_hash text not null,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_access_credentials enable row level security;
revoke all on public.admin_access_credentials from public, anon, authenticated;
grant select, insert, update, delete on public.admin_access_credentials to service_role;

-- Persistent per-source throttling (survives serverless instance recycling).
create table if not exists public.admin_login_throttle (
  source_hash text primary key,
  window_started_at timestamptz not null default now(),
  failures integer not null default 0 check (failures >= 0),
  blocked_until timestamptz
);
alter table public.admin_login_throttle enable row level security;
revoke all on public.admin_login_throttle from public, anon, authenticated;
grant select, insert, update, delete on public.admin_login_throttle to service_role;

create or replace function public.admin_login_is_limited(p_source_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v public.admin_login_throttle%rowtype;
begin
  select * into v from public.admin_login_throttle where source_hash = p_source_hash;
  return found and v.blocked_until is not null and v.blocked_until > now();
end;
$$;

create or replace function public.admin_login_record_failure(p_source_hash text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v public.admin_login_throttle%rowtype;
begin
  insert into public.admin_login_throttle(source_hash, window_started_at, failures)
  values (p_source_hash, now(), 1)
  on conflict (source_hash) do update set
    window_started_at = case when public.admin_login_throttle.window_started_at < now() - interval '15 minutes' then now() else public.admin_login_throttle.window_started_at end,
    failures = case when public.admin_login_throttle.window_started_at < now() - interval '15 minutes' then 1 else public.admin_login_throttle.failures + 1 end,
    blocked_until = case
      when public.admin_login_throttle.window_started_at < now() - interval '15 minutes' then null
      when public.admin_login_throttle.failures + 1 >= 8 then now() + interval '15 minutes'
      else public.admin_login_throttle.blocked_until end
  returning failures into v.failures;
  return v.failures;
end;
$$;

create or replace function public.admin_login_clear_failures(p_source_hash text)
returns void language sql security definer set search_path = '' as $$
  delete from public.admin_login_throttle where source_hash = p_source_hash;
$$;

revoke all on function public.admin_login_is_limited(text) from public, anon, authenticated;
revoke all on function public.admin_login_record_failure(text) from public, anon, authenticated;
revoke all on function public.admin_login_clear_failures(text) from public, anon, authenticated;
grant execute on function public.admin_login_is_limited(text) to service_role;
grant execute on function public.admin_login_record_failure(text) to service_role;
grant execute on function public.admin_login_clear_failures(text) to service_role;
