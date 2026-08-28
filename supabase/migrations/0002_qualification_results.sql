create table public.qualification_evaluations (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null unique references public.calls(id) on delete cascade,
  rules_version text not null,
  status text not null check (status in ('QUALIFIED', 'NOT_QUALIFIED', 'NEEDS_REVIEW')),
  input jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz
);

create table public.qualification_criteria_results (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.qualification_evaluations(id) on delete cascade,
  criterion_key text not null,
  label text not null,
  required boolean not null,
  outcome text not null check (outcome in ('PASS', 'FAIL', 'NEEDS_REVIEW', 'CAPTURED')),
  value jsonb,
  reason text not null,
  evidence jsonb,
  sort_order integer not null default 0,
  unique (evaluation_id, criterion_key)
);

create index qualification_evaluations_call_idx on public.qualification_evaluations(call_id);
create index qualification_evaluations_status_idx on public.qualification_evaluations(status);
create index qualification_results_evaluation_idx on public.qualification_criteria_results(evaluation_id, sort_order);

alter table public.qualification_evaluations enable row level security;
alter table public.qualification_criteria_results enable row level security;

create policy qualification_evaluations_member_select on public.qualification_evaluations for select using (exists (select 1 from public.calls c where c.id = call_id and public.is_org_member(c.organization_id)));
create policy qualification_criteria_member_select on public.qualification_criteria_results for select using (exists (select 1 from public.qualification_evaluations e join public.calls c on c.id = e.call_id where e.id = evaluation_id and public.is_org_member(c.organization_id)));

