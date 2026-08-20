-- Butz-Liftparts Konfigurator: Kundenanfragen mit Mitarbeiter-Freigabe
-- In Supabase: SQL Editor -> New query -> einfügen -> Run

create table if not exists public.customer_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  status text not null default 'Neu',
  company text not null,
  contact_name text,
  email text not null,
  phone text,
  order_number text,
  project text,
  message text,
  components jsonb not null default '[]'::jsonb,
  source text not null default 'konfigurator',
  configuration jsonb,
  approved_at timestamptz,
  approved_by text,
  rejected_at timestamptz,
  notes_internal text
);

alter table public.customer_requests enable row level security;

drop policy if exists "Kunden duerfen Anfragen anlegen" on public.customer_requests;
drop policy if exists "Mitarbeiter duerfen Kundenanfragen lesen" on public.customer_requests;
drop policy if exists "Mitarbeiter duerfen Kundenanfragen bearbeiten" on public.customer_requests;
drop policy if exists "Mitarbeiter duerfen Kundenanfragen loeschen" on public.customer_requests;

-- Kunden/öffentliche Nutzer dürfen nur neue Anfragen anlegen, aber nichts lesen.
create policy "Kunden duerfen Anfragen anlegen"
on public.customer_requests
for insert
to anon
with check (status = 'Neu');

-- Eingeloggte Mitarbeiter dürfen Kundenanfragen verwalten.
create policy "Mitarbeiter duerfen Kundenanfragen lesen"
on public.customer_requests
for select
to authenticated
using (true);

create policy "Mitarbeiter duerfen Kundenanfragen bearbeiten"
on public.customer_requests
for update
to authenticated
using (true)
with check (true);

create policy "Mitarbeiter duerfen Kundenanfragen loeschen"
on public.customer_requests
for delete
to authenticated
using (true);

-- Für Live-Aktualisierung im Mitarbeiterbereich.
alter publication supabase_realtime add table public.customer_requests;
