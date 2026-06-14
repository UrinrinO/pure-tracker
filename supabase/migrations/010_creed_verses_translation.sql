-- Add per-verse translation field so a single scripture creed can hold
-- multiple translations (NKJV, KJV, ESV, NIV, …) as separate verse rows.
alter table public.creed_verses
  add column if not exists translation text;

-- For any existing scripture verses, copy the translation from the parent creed row.
update public.creed_verses cv
set translation = c.translation
from public.creeds c
where cv.creed_id = c.id and c.type = 'scripture' and cv.translation is null;

-- Consolidate duplicate Luke 10:18-19 entries created by the old seed
-- (one row per translation) into a single creed whose verses carry the translation.
do $$
declare
  keeper_id uuid;
begin
  -- Is there more than one Luke 10:18-19 scripture creed?
  if (select count(*) from public.creeds where title = 'Luke 10:18-19' and type = 'scripture') > 1 then

    select id into keeper_id
    from public.creeds
    where title = 'Luke 10:18-19' and type = 'scripture'
    order by order_index asc
    limit 1;

    -- Re-home all verses from the duplicates to the keeper
    update public.creed_verses
    set creed_id = keeper_id
    where creed_id in (
      select id from public.creeds
      where title = 'Luke 10:18-19' and type = 'scripture' and id <> keeper_id
    );

    -- Remove the now-empty duplicate creed rows
    delete from public.creeds
    where title = 'Luke 10:18-19' and type = 'scripture' and id <> keeper_id;

    -- Clear the creed-level translation (it now lives on each verse row)
    update public.creeds set translation = null where id = keeper_id;

  end if;
end;
$$;
