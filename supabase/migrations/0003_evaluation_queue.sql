create or replace function public.claim_next_evaluation_job()
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
    where job_type = 'EVALUATION' and status = 'QUEUED'
    order by created_at asc
    for update skip locked
    limit 1
  )
  returning * into claimed;
  return claimed;
end;
$$;

revoke execute on function public.claim_next_evaluation_job() from public, anon, authenticated;
grant execute on function public.claim_next_evaluation_job() to service_role;
