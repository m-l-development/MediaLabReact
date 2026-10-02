-- Sletting av avsluttede samarbeidskoblinger (bare connecthub-dev først). Ingen eksisterende data endres av migreringen.
-- Bare Developer/Moderator (app.is_collab_admin, med MFA), og bare koblinger som er avsluttet (status 'ended').
-- Koblingens Samarbeidsfiler er kopier (originalene ligger i menighetene og røres ikke). Kopiradene slettes og
-- lagringsnøklene legges i file_cleanup_queue i samme transaksjon; serveren fjerner så filene fra lagringen og
-- registrerer resultatet (som ved opprydning). Loggført som links.delete.
create or replace function public.delete_link(p_link uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); l public.church_links; v_a text; v_b text; v_n int := 0; v_bytes bigint := 0;
        v_q uuid[] := '{}'; v_qid uuid; f record;
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into l from public.church_links where id = p_link for update;
  if l.id is null then raise exception 'Fant ikke koblingen' using errcode = '22023'; end if;
  if l.status <> 'ended' then raise exception 'Bare avsluttede koblinger kan slettes. Avslutt koblingen først.' using errcode = '22023'; end if;
  select name into v_a from public.churches where id = l.church_a; select name into v_b from public.churches where id = l.church_b;
  for f in select * from public.files where link_id = p_link for update loop
    insert into public.file_cleanup_queue (file_id, church_id, storage_key, file_name, file_size, former_owner, requested_by)
    values (f.id, f.church_id, f.storage_key, f.file_name, f.file_size, f.uploaded_by, v_actor) returning id into v_qid;
    v_q := v_q || v_qid; v_n := v_n + 1; v_bytes := v_bytes + f.file_size;
  end loop;
  delete from public.files where link_id = p_link;
  delete from public.church_links where id = p_link;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'links.delete', 'church_links', p_link::text,
          jsonb_build_object('church_a', l.church_a, 'church_b', l.church_b, 'name', concat_ws(' – ', v_a, v_b), 'copies', v_n, 'bytes', v_bytes,
                             'created_at', l.created_at, 'ended_at', l.ended_at));
  return jsonb_build_object('ok', true, 'copies', v_n, 'bytes', v_bytes, 'queue', to_jsonb(v_q));
end $$;
revoke all on function public.delete_link(uuid) from public, anon;
grant execute on function public.delete_link(uuid) to authenticated;
