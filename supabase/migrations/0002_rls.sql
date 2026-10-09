-- ═══════════════════════════════════════════════════════════════════════════
-- Vantara Weddings — Phase 5, Stage 2: Row Level Security
-- 0002_rls.sql — enable RLS on EVERY table, explicit policies, is_admin()
-- helper, and guard triggers for field integrity.
--
-- Model (§13.4):
--   anon         → read approved vendors + their venues/media, cities/localities;
--                  insert leads (status 'new', unassigned)
--   customer     → own profile, own leads, own ideabook rows
--   vendor       → own vendor row + media, leads ASSIGNED to them (read), own bookings
--   admin        → everything, via is_admin() (security definer — no RLS recursion)
--
-- Policy scope lives in RLS; immutable-field rules live in BEFORE UPDATE
-- triggers (role/status/assignment can never be self-elevated).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── helper: is the signed-in user an admin? ─────────────────────────────────
-- SECURITY DEFINER reads profiles without its RLS (owner bypass), which both
-- avoids recursion on profiles policies and lets every table reference it.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- PostgREST exposes functions as RPC — harmless for anon/authenticated
-- (is_admin() is always false without an admin JWT) and REQUIRED because
-- anon-facing policies reference it.
grant execute on function public.is_admin() to anon, authenticated;

-- ── enable RLS on every table ───────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.vendors        enable row level security;
alter table public.venues         enable row level security;
alter table public.vendor_media   enable row level security;
alter table public.cities         enable row level security;
alter table public.localities     enable row level security;
alter table public.leads          enable row level security;
alter table public.bookings       enable row level security;
alter table public.ideabook_items enable row level security;

-- ═══ profiles ══════════════════════════════════════════════════════════════
create policy "profiles: own or admin reads"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles: self-create customer, admin create"
  on public.profiles for insert
  with check (
    (id = auth.uid() and role = 'customer') or public.is_admin()
  );

create policy "profiles: own or admin updates"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "profiles: own or admin deletes"
  on public.profiles for delete
  using (id = auth.uid() or public.is_admin());

-- Role immutability for non-admins (§13.2: only an admin can change a role).
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an admin can change a profile role';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ═══ vendors ═══════════════════════════════════════════════════════════════
-- Public/anon: approved only. Owner: their own row at any status. Admin: all.
create policy "vendors: approved public, own, admin"
  on public.vendors for select
  using (status = 'approved' or owner_user_id = auth.uid() or public.is_admin());

create policy "vendors: register pending, admin creates"
  on public.vendors for insert
  with check (
    (owner_user_id = auth.uid() and status = 'pending') or public.is_admin()
  );

create policy "vendors: owner or admin updates"
  on public.vendors for update
  using (owner_user_id = auth.uid() or public.is_admin())
  with check (owner_user_id = auth.uid() or public.is_admin());

create policy "vendors: owner or admin deletes"
  on public.vendors for delete
  using (owner_user_id = auth.uid() or public.is_admin());

-- Approval is an admin action (§13.7) — owners cannot flip their own status.
create or replace function public.guard_vendor_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status and not public.is_admin() then
    raise exception 'Only an admin can change a vendor status';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_vendor_status on public.vendors;
create trigger guard_vendor_status
  before update on public.vendors
  for each row execute function public.guard_vendor_status();

-- ═══ venues ════════════════════════════════════════════════════════════════
create policy "venues: public via approved vendor, own vendor, admin"
  on public.venues for select
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id
        and (v.status = 'approved' or v.owner_user_id = auth.uid())
    )
    or public.is_admin()
  );

create policy "venues: owning vendor or admin writes"
  on public.venues for insert
  with check (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.owner_user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "venues: owning vendor or admin updates"
  on public.venues for update
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.owner_user_id = auth.uid()
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.owner_user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "venues: owning vendor or admin deletes"
  on public.venues for delete
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.owner_user_id = auth.uid()
    )
    or public.is_admin()
  );

-- ═══ vendor_media ══════════════════════════════════════════════════════════
create policy "vendor_media: public via approved vendor, own vendor, admin"
  on public.vendor_media for select
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id
        and (v.status = 'approved' or v.owner_user_id = auth.uid())
    )
    or public.is_admin()
  );

create policy "vendor_media: owning vendor or admin writes"
  on public.vendor_media for insert
  with check (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.owner_user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "vendor_media: owning vendor or admin updates"
  on public.vendor_media for update
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.owner_user_id = auth.uid()
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.owner_user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "vendor_media: owning vendor or admin deletes"
  on public.vendor_media for delete
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.owner_user_id = auth.uid()
    )
    or public.is_admin()
  );

-- ═══ cities / localities ═══════════════════════════════════════════════════
create policy "cities: public read"
  on public.cities for select
  using (true);

create policy "cities: admin writes"
  on public.cities for insert
  with check (public.is_admin());

create policy "cities: admin updates"
  on public.cities for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "cities: admin deletes"
  on public.cities for delete
  using (public.is_admin());

create policy "localities: public read"
  on public.localities for select
  using (true);

create policy "localities: admin writes"
  on public.localities for insert
  with check (public.is_admin());

create policy "localities: admin updates"
  on public.localities for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "localities: admin deletes"
  on public.localities for delete
  using (public.is_admin());

-- ═══ leads ═════════════════════════════════════════════════════════════════
-- Read: own enquiries, admin, and vendors ONLY for leads assigned to them
-- (the §13.4 test: a vendor cannot read another vendor's leads).
create policy "leads: own, assigned vendor, admin read"
  on public.leads for select
  using (
    customer_id = auth.uid()
    or public.is_admin()
    or assigned_vendor_id in (
      select v.id from public.vendors v where v.owner_user_id = auth.uid()
    )
  );

-- Insert: public lead forms (anon) — always 'new' + unassigned; a signed-in
-- customer may attach their own id. Status/assignment forgery blocked here.
create policy "leads: public intake"
  on public.leads for insert
  with check (
    (
      (customer_id is null or customer_id = auth.uid())
      and status = 'new'
      and assigned_vendor_id is null
    )
    or public.is_admin()
  );

-- Update: customer (own row) + admin. Vendors READ assigned leads only.
create policy "leads: own or admin updates"
  on public.leads for update
  using (customer_id = auth.uid() or public.is_admin())
  with check (customer_id = auth.uid() or public.is_admin());

create policy "leads: admin deletes"
  on public.leads for delete
  using (public.is_admin());

-- Pipeline integrity: status + assignment change = admin only (§13.7).
create or replace function public.guard_lead_pipeline()
returns trigger
language plpgsql
as $$
begin
  if not public.is_admin() then
    if new.status is distinct from old.status then
      raise exception 'Only an admin can change a lead status';
    end if;
    if new.assigned_vendor_id is distinct from old.assigned_vendor_id then
      raise exception 'Only an admin can assign a lead';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_lead_pipeline on public.leads;
create trigger guard_lead_pipeline
  before update on public.leads
  for each row execute function public.guard_lead_pipeline();

-- ═══ bookings ══════════════════════════════════════════════════════════════
create policy "bookings: admin, owning vendor, customer of the lead"
  on public.bookings for select
  using (
    public.is_admin()
    or vendor_id in (
      select v.id from public.vendors v where v.owner_user_id = auth.uid()
    )
    or lead_id in (
      select l.id from public.leads l where l.customer_id = auth.uid()
    )
  );

create policy "bookings: admin inserts"
  on public.bookings for insert
  with check (public.is_admin());

create policy "bookings: admin updates"
  on public.bookings for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "bookings: admin deletes"
  on public.bookings for delete
  using (public.is_admin());

-- ═══ ideabook_items ════════════════════════════════════════════════════════
create policy "ideabook: own rows, admin sees all"
  on public.ideabook_items for select
  using (user_id = auth.uid() or public.is_admin());

create policy "ideabook: own inserts"
  on public.ideabook_items for insert
  with check (user_id = auth.uid());

create policy "ideabook: own updates"
  on public.ideabook_items for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "ideabook: own or admin deletes"
  on public.ideabook_items for delete
  using (user_id = auth.uid() or public.is_admin());

-- ═══ privileges (least grant, RLS decides rows) ════════════════════════════
-- anon: the public directory + lead intake ONLY.
grant select on public.vendors, public.venues, public.vendor_media,
               public.cities, public.localities to anon;
grant insert on public.leads to anon;

-- authenticated: full DML — RLS row policies scope every table.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- Functions (is_admin) callable by the roles whose policies use them.
grant execute on all functions in schema public to anon, authenticated;
alter default privileges in schema public grant execute on functions to authenticated;
