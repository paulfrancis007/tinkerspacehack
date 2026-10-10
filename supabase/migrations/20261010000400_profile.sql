begin;

create function public.save_profile(
  p_display_name text,
  p_avatar_seed text,
  p_bio text,
  p_interests text[],
  p_adult_attested boolean
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not p_adult_attested then
    raise exception 'You must attest to being 18 or older to use SIDEQUEST.';
  end if;

  insert into public.profiles (
    id,
    display_name,
    avatar_seed,
    bio,
    interests,
    adult_attested_at
  ) values (
    v_user_id,
    p_display_name,
    p_avatar_seed,
    coalesce(p_bio, ''),
    coalesce(p_interests, '{}'),
    now()
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_seed = excluded.avatar_seed,
    bio = excluded.bio,
    interests = excluded.interests;
end;
$$;

revoke all on function public.save_profile(text, text, text, text[], boolean) from public, anon;
grant execute on function public.save_profile(text, text, text, text[], boolean) to authenticated;

commit;
