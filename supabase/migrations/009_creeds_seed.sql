-- ─── SEED: Our Creeds ────────────────────────────────────────────────────────
-- Run this AFTER 008_creeds.sql and 010_creed_verses_translation.sql.
-- Safe to re-run: deletes and reseeds both entries.

delete from public.creeds where title in ('O Thou Who Camest From Above', 'Luke 10:18-19');

-- ── 1. Hymn ──────────────────────────────────────────────────────────────────
with hymn as (
  insert into public.creeds (type, title, author, translation, active, order_index)
  values ('hymn', 'O Thou Who Camest From Above', 'Charles Wesley', null, true, 0)
  returning id
)
insert into public.creed_verses (creed_id, verse_index, verse_label, translation, content)
select hymn.id, v.verse_index, v.verse_label, null, v.content
from hymn, (values
  (0, '1', 'O Thou who camest from above,
The pure celestial fire to impart,
Kindle a flame of sacred love
On the mean altar of my heart.'),
  (1, '2', 'There let it for Thy glory burn
With inextinguishable blaze,
And trembling to its source return,
In humble prayer and fervent praise.'),
  (2, '3', 'Jesus, confirm my heart''s desire
To work and speak and think for Thee;
Still let me guard the holy fire,
And still stir up Thy gift in me.'),
  (3, '4', 'Ready for all Thy perfect will,
My acts of faith and love repeat,
Till death Thy endless mercies seal,
And make my sacrifice complete.')
) as v(verse_index, verse_label, content);

-- ── 2. Luke 10:18-19 — all four translations in one creed ───────────────────
-- creed.translation = 'NKJV' is the default shown first in the switcher.
with c as (
  insert into public.creeds (type, title, author, translation, active, order_index)
  values ('scripture', 'Luke 10:18-19', null, 'NKJV', true, 1)
  returning id
)
insert into public.creed_verses (creed_id, verse_index, verse_label, translation, content)
select c.id, v.verse_index, v.verse_label, v.translation, v.content
from c, (values
  -- NKJV
  (0, '18', 'NKJV', 'And He said to them, "I saw Satan fall like lightning from heaven.'),
  (1, '19', 'NKJV', 'Behold, I give you the authority to trample on serpents and scorpions, and over all the power of the enemy, and nothing shall by any means hurt you.'),
  -- KJV
  (0, '18', 'KJV',  'And he said unto them, I beheld Satan as lightning fall from heaven.'),
  (1, '19', 'KJV',  'Behold, I give unto you power to tread on serpents and scorpions, and over all the power of the enemy: and nothing shall by any means hurt you.'),
  -- ESV
  (0, '18', 'ESV',  'And he said to them, "I saw Satan fall like lightning from heaven.'),
  (1, '19', 'ESV',  'Behold, I have given you authority to tread on serpents and scorpions, and over all the power of the enemy, and nothing shall hurt you.'),
  -- NIV
  (0, '18', 'NIV',  'He replied, "I saw Satan fall like lightning from heaven.'),
  (1, '19', 'NIV',  'I have given you authority to trample on snakes and scorpions and to overcome all the power of the enemy; nothing will harm you.')
) as v(verse_index, verse_label, translation, content);
