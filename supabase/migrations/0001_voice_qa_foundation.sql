create extension if not exists pgcrypto;

create type public.member_role as enum ('ADMIN', 'QA_SUPERVISOR', 'QA_ANALYST', 'VIEWER');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'VIEWER',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  external_id text,
  created_at timestamptz not null default now()
);

create table public.qa_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  passing_score numeric(5,2) not null default 80 check (passing_score between 0 and 100),
  active_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.qa_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.qa_templates(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (template_id, version_number)
);

alter table public.qa_templates add constraint qa_templates_active_version_fk foreign key (active_version_id) references public.qa_template_versions(id);

create table public.qa_criteria (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.qa_template_versions(id) on delete cascade,
  name text not null,
  description text,
  weight numeric(5,2) not null check (weight >= 0 and weight <= 100),
  evaluation_type text not null check (evaluation_type in ('PASS_FAIL', 'PASS_PARTIAL_FAIL')),
  blocking boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table public.qa_criterion_rules (
  id uuid primary key default gen_random_uuid(),
  criterion_id uuid not null references public.qa_criteria(id) on delete cascade,
  rule_text text not null,
  sort_order integer not null default 0
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  template_version_id uuid references public.qa_template_versions(id) on delete set null,
  original_filename text not null,
  storage_path text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  duration_seconds numeric,
  status text not null default 'UPLOADING',
  uploaded_by uuid not null references auth.users(id),
  verdict text,
  overall_score numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  job_type text not null check (job_type in ('TRANSCRIPTION', 'EVALUATION', 'REPORT_GENERATION')),
  status text not null default 'QUEUED' check (status in ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')),
  attempts integer not null default 0 check (attempts >= 0),
  error_code text,
  error_message text,
  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (call_id, job_type)
);

create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null unique references public.calls(id) on delete cascade,
  language text,
  model text not null,
  status text not null default 'PROCESSING' check (status in ('PROCESSING', 'COMPLETED', 'FAILED', 'NEEDS_REVIEW')),
  duration_seconds numeric,
  detected_speakers integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references public.transcripts(id) on delete cascade,
  speaker text not null,
  start_seconds numeric not null check (start_seconds >= 0),
  end_seconds numeric not null check (end_seconds >= start_seconds),
  text text not null,
  sort_order integer not null default 0
);

create index organization_members_user_id_idx on public.organization_members(user_id);
create index agents_organization_id_idx on public.agents(organization_id);
create index calls_organization_created_idx on public.calls(organization_id, created_at desc);
create index calls_status_idx on public.calls(status);
create index criterion_rules_criterion_id_idx on public.qa_criterion_rules(criterion_id);
create index processing_jobs_queue_idx on public.processing_jobs(status, created_at);
create index transcript_segments_transcript_idx on public.transcript_segments(transcript_id, sort_order);

create or replace function public.claim_next_transcription_job()
returns public.processing_jobs
language plpgsql
security invoker
set search_path = public
as $$
declare claimed public.processing_jobs;
begin
  update public.processing_jobs
  set status = 'PROCESSING', attempts = attempts + 1, locked_at = now(), started_at = coalesce(started_at, now())
  where id = (
    select id from public.processing_jobs
    where job_type = 'TRANSCRIPTION' and status = 'QUEUED'
    order by created_at asc
    for update skip locked
    limit 1
  )
  returning * into claimed;
  return claimed;
end;
$$;

revoke execute on function public.claim_next_transcription_job() from public, anon, authenticated;
grant execute on function public.claim_next_transcription_job() to service_role;

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members where organization_id = target_org and user_id = auth.uid());
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.agents enable row level security;
alter table public.qa_templates enable row level security;
alter table public.qa_template_versions enable row level security;
alter table public.qa_criteria enable row level security;
alter table public.qa_criterion_rules enable row level security;
alter table public.calls enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.transcripts enable row level security;
alter table public.transcript_segments enable row level security;

create policy organizations_member_select on public.organizations for select using (public.is_org_member(id));
create policy organization_members_self_or_member_select on public.organization_members for select using (user_id = auth.uid() or public.is_org_member(organization_id));
create policy agents_member_select on public.agents for select using (public.is_org_member(organization_id));
create policy templates_member_select on public.qa_templates for select using (public.is_org_member(organization_id));
create policy templates_manager_insert on public.qa_templates for insert to authenticated with check (exists (select 1 from public.organization_members m where m.organization_id = organization_id and m.user_id = auth.uid() and m.role in ('ADMIN', 'QA_SUPERVISOR')));
create policy templates_manager_update on public.qa_templates for update to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = organization_id and m.user_id = auth.uid() and m.role in ('ADMIN', 'QA_SUPERVISOR'))) with check (exists (select 1 from public.organization_members m where m.organization_id = organization_id and m.user_id = auth.uid() and m.role in ('ADMIN', 'QA_SUPERVISOR')));
create policy template_versions_member_select on public.qa_template_versions for select using (exists (select 1 from public.qa_templates t where t.id = template_id and public.is_org_member(t.organization_id)));
create policy template_versions_manager_insert on public.qa_template_versions for insert to authenticated with check (exists (select 1 from public.qa_templates t join public.organization_members m on m.organization_id = t.organization_id where t.id = template_id and m.user_id = auth.uid() and m.role in ('ADMIN', 'QA_SUPERVISOR')));
create policy criteria_member_select on public.qa_criteria for select using (exists (select 1 from public.qa_template_versions v join public.qa_templates t on t.id = v.template_id where v.id = template_version_id and public.is_org_member(t.organization_id)));
create policy criteria_manager_insert on public.qa_criteria for insert to authenticated with check (exists (select 1 from public.qa_template_versions v join public.qa_templates t on t.id = v.template_id join public.organization_members m on m.organization_id = t.organization_id where v.id = template_version_id and m.user_id = auth.uid() and m.role in ('ADMIN', 'QA_SUPERVISOR')));
create policy criterion_rules_member_select on public.qa_criterion_rules for select using (exists (select 1 from public.qa_criteria c join public.qa_template_versions v on v.id = c.template_version_id join public.qa_templates t on t.id = v.template_id where c.id = criterion_id and public.is_org_member(t.organization_id)));
create policy criterion_rules_manager_insert on public.qa_criterion_rules for insert to authenticated with check (exists (select 1 from public.qa_criteria c join public.qa_template_versions v on v.id = c.template_version_id join public.qa_templates t on t.id = v.template_id join public.organization_members m on m.organization_id = t.organization_id where c.id = criterion_id and m.user_id = auth.uid() and m.role in ('ADMIN', 'QA_SUPERVISOR')));
create policy calls_member_select on public.calls for select using (public.is_org_member(organization_id));
create policy calls_uploader_insert on public.calls for insert to authenticated with check (uploaded_by = auth.uid() and public.is_org_member(organization_id));
create policy jobs_member_select on public.processing_jobs for select using (exists (select 1 from public.calls c where c.id = call_id and public.is_org_member(c.organization_id)));
create policy jobs_member_insert on public.processing_jobs for insert to authenticated with check (exists (select 1 from public.calls c where c.id = call_id and public.is_org_member(c.organization_id)));
create policy jobs_member_update on public.processing_jobs for update using (exists (select 1 from public.calls c where c.id = call_id and public.is_org_member(c.organization_id))) with check (exists (select 1 from public.calls c where c.id = call_id and public.is_org_member(c.organization_id)));
create policy transcripts_member_select on public.transcripts for select using (exists (select 1 from public.calls c where c.id = call_id and public.is_org_member(c.organization_id)));
create policy transcript_segments_member_select on public.transcript_segments for select using (exists (select 1 from public.transcripts t join public.calls c on c.id = t.call_id where t.id = transcript_id and public.is_org_member(c.organization_id)));

create policy recordings_member_insert on storage.objects for insert to authenticated with check (bucket_id = 'voice-qa-recordings' and public.is_org_member((storage.foldername(name))[1]::uuid));
create policy recordings_member_select on storage.objects for select to authenticated using (bucket_id = 'voice-qa-recordings' and public.is_org_member((storage.foldername(name))[1]::uuid));

insert into storage.buckets (id, name, public) values ('voice-qa-recordings', 'voice-qa-recordings', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('voice-qa-reports', 'voice-qa-reports', false) on conflict (id) do nothing;
