-- Dedicated Callcraft tables only. Apply to the confirmed project after review.
begin;
create table public.callcraft_services (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now()
);
create index callcraft_services_owner_idx on public.callcraft_services(owner_id);
create table public.callcraft_service_versions (
 service_id uuid not null references public.callcraft_services(id) on delete restrict,
 version bigint not null check(version>0),
 document jsonb not null check(jsonb_typeof(document)='object' and octet_length(document::text)<=45000),
 archived boolean not null default false,
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 primary key(service_id,version)
);
alter table public.callcraft_services enable row level security;
alter table public.callcraft_service_versions enable row level security;
create policy callcraft_owner_read on public.callcraft_services for select to authenticated using(owner_id=(select auth.uid()));
create policy callcraft_version_read on public.callcraft_service_versions for select to authenticated using(exists(select 1 from public.callcraft_services s where s.id=service_id and s.owner_id=(select auth.uid())));
revoke all on public.callcraft_services, public.callcraft_service_versions from anon,authenticated;
grant select on public.callcraft_services,public.callcraft_service_versions to authenticated;
create view public.callcraft_current_services with(security_invoker=true) as
 select s.id,s.owner_id,s.created_at,v.version,v.document,v.archived,v.created_at as updated_at
 from public.callcraft_services s join lateral (
 select * from public.callcraft_service_versions v where v.service_id=s.id order by v.version desc limit 1
 ) v on true;
revoke all on public.callcraft_current_services from anon;
grant select on public.callcraft_current_services to authenticated;

create function public.callcraft_valid_document(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text; f jsonb;
begin
 if jsonb_typeof(d)<>'object' or octet_length(d::text)>45000 then return false;end if;
 if exists(select 1 from jsonb_object_keys(d) as keys(key) where key not in ('name','company','audience','description','reason','goal','greeting','rules','faqs')) then return false;end if;
 foreach k in array array['name','company','audience','description','reason','goal','greeting','rules'] loop
 if jsonb_typeof(d->k) is distinct from 'string' or length(d->>k)>4000 then return false;end if;
 end loop;
 foreach k in array array['name','company','description','reason'] loop
 if length(btrim(d->>k))=0 then return false;end if;
 end loop;
 foreach k in array array['name','company','audience','goal','greeting'] loop
 if length(d->>k)>500 then return false;end if;
 end loop;
 if jsonb_typeof(d->'faqs') is distinct from 'array' then return false;end if;
 if jsonb_array_length(d->'faqs')>30 then return false;end if;
 for f in select value from jsonb_array_elements(d->'faqs') loop
 if jsonb_typeof(f)<>'object' or jsonb_typeof(f->'id') is distinct from 'string' or jsonb_typeof(f->'question') is distinct from 'string' or jsonb_typeof(f->'answer') is distinct from 'string' then return false;end if;
 if length(f->>'id')=0 or length(btrim(f->>'question'))=0 or length(btrim(f->>'answer'))=0 or length(f->>'question')>200 or length(f->>'answer')>1000 then return false;end if;
 end loop;
 if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(d->'faqs')) then return false;end if;
 return true;
end;$$;
alter table public.callcraft_service_versions add constraint callcraft_valid_service_document check(public.callcraft_valid_document(document));

create function public.callcraft_save_service(p_id uuid,p_document jsonb,p_archived boolean,p_expected_version bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); current_version bigint; service_owner uuid; result jsonb;
begin
 if actor is null then raise exception 'Sign in first' using errcode='42501';end if;
 if p_id is null or p_archived is null or p_expected_version is null or p_expected_version<0 or not public.callcraft_valid_document(p_document) then raise exception 'Invalid service' using errcode='22023';end if;
 -- Serialize creation/update of a service; optimistic version check prevents lost edits.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select owner_id into service_owner from public.callcraft_services where id=p_id;
 if service_owner is null then
 if p_expected_version<>0 then raise exception 'Service version conflict' using errcode='40001';end if;
 insert into public.callcraft_services(id,owner_id) values(p_id,actor);
 elsif service_owner<>actor then raise exception 'Not permitted' using errcode='42501';end if;
 select coalesce(max(version),0) into current_version from public.callcraft_service_versions where service_id=p_id;
 if current_version<>p_expected_version then raise exception 'Service version conflict' using errcode='40001';end if;
 insert into public.callcraft_service_versions(service_id,version,document,archived,created_by) values(p_id,current_version+1,p_document,p_archived,actor);
 select to_jsonb(v) into result from public.callcraft_current_services v where id=p_id;
 return result;
end;$$;
revoke all on function public.callcraft_save_service(uuid,jsonb,boolean,bigint) from public,anon;
grant execute on function public.callcraft_save_service(uuid,jsonb,boolean,bigint) to authenticated;

-- Immutable request events are the source for rate limits; no duplicated counters.
create table public.callcraft_practice_requests(
 id bigint generated always as identity primary key,
 owner_id uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp()
);
create index callcraft_practice_owner_time_idx on public.callcraft_practice_requests(owner_id,created_at);
alter table public.callcraft_practice_requests enable row level security;
revoke all on public.callcraft_practice_requests from anon,authenticated;
create function public.callcraft_reserve_practice() returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'Sign in first' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,1));
 if (select count(*) from public.callcraft_practice_requests where owner_id=actor and created_at>clock_timestamp()-interval '1 minute')>=10
 or (select count(*) from public.callcraft_practice_requests where owner_id=actor and created_at>clock_timestamp()-interval '24 hours')>=100 then
 raise exception 'practice_limit' using errcode='P0001';end if;
 insert into public.callcraft_practice_requests(owner_id) values(actor);
end;$$;
revoke all on function public.callcraft_reserve_practice() from public,anon;
grant execute on function public.callcraft_reserve_practice() to authenticated;
-- No application grants allow UPDATE/DELETE of versions or audit events.
commit;
