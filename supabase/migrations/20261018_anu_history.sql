begin;
create table if not exists public.anu_conversations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  space text not null check (space in ('anu','devvrats')),
  title text not null check (char_length(title) between 1 and 80),
  messages jsonb not null check (jsonb_typeof(messages) = 'array' and jsonb_array_length(messages) <= 60 and octet_length(messages::text) <= 32768),
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
create index if not exists anu_conversations_owner_space on public.anu_conversations(user_id,space,updated_at desc);
create index if not exists anu_conversations_expiry on public.anu_conversations(updated_at);
alter table public.anu_conversations enable row level security;
revoke all on public.anu_conversations from anon, authenticated;
grant select, delete on public.anu_conversations to authenticated;
create policy anu_history_read on public.anu_conversations for select to authenticated using (user_id = (select auth.uid()) and updated_at > now() - interval '45 days');
create policy anu_history_delete on public.anu_conversations for delete to authenticated using (user_id = (select auth.uid()));

-- One atomic, owner-scoped save; locks cap concurrent inserts and reject stale writes.
create or replace function public.anu_save_conversation(p_id uuid,p_space text,p_title text,p_messages jsonb,p_revision integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); existing public.anu_conversations; saved public.anu_conversations;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_revision is null or p_revision < 0 or p_space not in ('anu','devvrats') or p_space is null or p_title is null or char_length(p_title) not between 1 and 80 or p_messages is null or jsonb_typeof(p_messages) <> 'array' or jsonb_array_length(p_messages) > 60 or octet_length(p_messages::text) > 32768 then raise exception 'Invalid conversation' using errcode='22023'; end if;
  if exists (select 1 from jsonb_array_elements(p_messages) m where jsonb_typeof(m) <> 'array' or jsonb_array_length(m) <> 2 or jsonb_typeof(m->0) <> 'number' or m->>0 not in ('0','1') or jsonb_typeof(m->1) <> 'string' or char_length(m->>1) > 10000) then raise exception 'Invalid messages' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text,0));
  select * into existing from public.anu_conversations where id=p_id for update;
  if found then
    if existing.user_id <> owner_id or existing.space <> p_space then raise exception 'Conversation unavailable' using errcode='42501'; end if;
    if existing.updated_at <= now() - interval '45 days' or existing.revision <> p_revision then raise exception 'Conversation changed; reload before saving' using errcode='40001'; end if;
    update public.anu_conversations set title=p_title,messages=p_messages,revision=revision+1,updated_at=now() where id=p_id returning * into saved;
  else
    if p_revision <> 0 then raise exception 'Conversation removed; reload before saving' using errcode='40001'; end if;
    delete from public.anu_conversations where user_id=owner_id and updated_at <= now() - interval '45 days';
    insert into public.anu_conversations(id,user_id,space,title,messages) values(p_id,owner_id,p_space,p_title,p_messages) returning * into saved;
    delete from public.anu_conversations where id in (select id from public.anu_conversations where user_id=owner_id and space=p_space order by updated_at desc,id desc offset 20);
  end if;
  return jsonb_build_object('revision',saved.revision,'updatedAt',extract(epoch from saved.updated_at)*1000);
end;
$$;
revoke all on function public.anu_save_conversation(uuid,text,text,jsonb,integer) from public,anon;
grant execute on function public.anu_save_conversation(uuid,text,text,jsonb,integer) to authenticated;
create or replace function public.anu_search_conversations(p_space text,p_query text)
returns table(id uuid,space text,title text,updated_at timestamptz,revision integer)
language sql stable security invoker set search_path = '' as $$
  select c.id,c.space,c.title,c.updated_at,c.revision from public.anu_conversations c
  where c.user_id = auth.uid() and c.space = p_space
    and c.updated_at > now() - interval '45 days'
    and position(lower(left(p_query,200)) in lower(c.title || ' ' || c.messages::text)) > 0
  order by c.updated_at desc limit 20;
$$;
revoke all on function public.anu_search_conversations(text,text) from public,anon;
grant execute on function public.anu_search_conversations(text,text) to authenticated;
commit;
