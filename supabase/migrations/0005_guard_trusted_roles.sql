-- ═══════════════════════════════════════════════════════════════════════════
-- Vantara Weddings — 0005: guard triggers must not block trusted server roles.
--
-- Caught by the live Stage-2 verification run: the guards from 0002 checked
-- only public.is_admin(), which is FALSE whenever there is no signed-in user —
-- so the postgres role (SQL editor / migrations / seed) and service_role
-- (server-side code) could not change roles or statuses AT ALL. Even the
-- documented "promote your first admin" bootstrap failed with
-- "Only an admin can change a profile role".
--
-- Rule going forward: integrity guards apply to USER sessions (anon /
-- authenticated). Trusted roles — postgres, service_role, supabase_admin —
-- bypass them, exactly as they already bypass RLS.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role
     and current_user not in ('postgres', 'service_role', 'supabase_admin')
     and not public.is_admin() then
    raise exception 'Only an admin can change a profile role';
  end if;
  return new;
end;
$$;

create or replace function public.guard_vendor_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status
     and current_user not in ('postgres', 'service_role', 'supabase_admin')
     and not public.is_admin() then
    raise exception 'Only an admin can change a vendor status';
  end if;
  return new;
end;
$$;

create or replace function public.guard_lead_pipeline()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
     and not public.is_admin() then
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
