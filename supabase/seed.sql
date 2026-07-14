-- Seeds fictional Côte d’Azur players and courts for local discovery testing.

insert into auth.users (id, phone, phone_confirmed_at, aud, role)
values
  ('10000000-0000-0000-0000-000000000001', '+33600000001', now(), 'authenticated', 'authenticated'),
  ('10000000-0000-0000-0000-000000000002', '+33600000002', now(), 'authenticated', 'authenticated'),
  ('10000000-0000-0000-0000-000000000003', '+33600000003', now(), 'authenticated', 'authenticated'),
  ('10000000-0000-0000-0000-000000000004', '+33600000004', now(), 'authenticated', 'authenticated'),
  ('10000000-0000-0000-0000-000000000005', '+33600000005', now(), 'authenticated', 'authenticated'),
  ('10000000-0000-0000-0000-000000000006', '+33600000006', now(), 'authenticated', 'authenticated');

insert into public.profiles (
  id, first_name, birth_year, bio, gender, level, formats, city, onboarding_completed_at
)
values
  ('10000000-0000-0000-0000-000000000001', 'Camille', 1993, 'Jeu régulier, plutôt fond de court. Disponible le week-end.', 'woman', 'intermediate', '{singles,either}', 'Nice', now()),
  ('10000000-0000-0000-0000-000000000002', 'Nicolas', 1988, 'Ancien compétiteur, partant pour des sets engagés après le travail.', 'man', 'advanced', '{singles}', 'Nice', now()),
  ('10000000-0000-0000-0000-000000000003', 'Inès', 1997, 'J’apprends vite et cherche des échanges détendus sans pression.', 'woman', 'beginner', '{either}', 'Cagnes-sur-Mer', now()),
  ('10000000-0000-0000-0000-000000000004', 'Thomas', 1990, 'Double ou simple, surtout le samedi matin autour de Cannes.', 'man', 'intermediate', '{doubles,either}', 'Cannes', now()),
  ('10000000-0000-0000-0000-000000000005', 'Alex', 1995, 'Niveau loisir avancé, flexible sur le court et le format.', 'non_binary', 'advanced', '{either}', 'Menton', now()),
  ('10000000-0000-0000-0000-000000000006', 'Sophie', 1985, 'Classée FFT, je cherche des partenaires réguliers pour préparer les tournois.', 'woman', 'competition', '{singles}', 'Grasse', now());

insert into public.locations (user_id, city, approximate_point)
values
  ('10000000-0000-0000-0000-000000000001', 'Nice', 'POINT(7.2620 43.7102)'),
  ('10000000-0000-0000-0000-000000000002', 'Nice', 'POINT(7.2700 43.7050)'),
  ('10000000-0000-0000-0000-000000000003', 'Cagnes-sur-Mer', 'POINT(7.1500 43.6646)'),
  ('10000000-0000-0000-0000-000000000004', 'Cannes', 'POINT(7.0174 43.5528)'),
  ('10000000-0000-0000-0000-000000000005', 'Menton', 'POINT(7.5048 43.7745)'),
  ('10000000-0000-0000-0000-000000000006', 'Grasse', 'POINT(6.9255 43.6584)');

insert into public.availability_slots (user_id, slot)
values
  ('10000000-0000-0000-0000-000000000001', 'weekend_morning'),
  ('10000000-0000-0000-0000-000000000001', 'weekday_evening'),
  ('10000000-0000-0000-0000-000000000002', 'weekday_evening'),
  ('10000000-0000-0000-0000-000000000003', 'weekend_afternoon'),
  ('10000000-0000-0000-0000-000000000004', 'weekend_morning'),
  ('10000000-0000-0000-0000-000000000005', 'weekend_afternoon'),
  ('10000000-0000-0000-0000-000000000006', 'weekday_morning');

insert into public.court_preferences (user_id, court_name)
values
  ('10000000-0000-0000-0000-000000000001', 'Nice Lawn Tennis Club'),
  ('10000000-0000-0000-0000-000000000002', 'Tennis Club Antibes'),
  ('10000000-0000-0000-0000-000000000003', 'Tennis Club Cagnes-sur-Mer'),
  ('10000000-0000-0000-0000-000000000004', 'ASLM Cannes'),
  ('10000000-0000-0000-0000-000000000005', 'Tennis Club Menton'),
  ('10000000-0000-0000-0000-000000000006', 'Tennis Club de Grasse');

insert into public.discovery_preferences (user_id, levels, preferred_format)
select id, enum_range(null::public.tennis_level), 'either'
from public.profiles;

insert into public.swipes (swiper_id, target_id, liked)
values
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', true);

insert into public.matches (id, user_a, user_b)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002'
);

insert into public.messages (match_id, sender_id, body, client_id)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Partant pour samedi matin ?',
  'seed-welcome-message'
);

-- Nice Free board samples (local Free tab smoke; soft city gate = Nice).
insert into public.free_windows (id, user_id, starts_at, ends_at, court_names, area_label)
values
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    now() + interval '1 hour',
    now() + interval '4 hours',
    array['Nice Lawn Tennis Club'],
    'Magnan'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    now() + interval '2 hours',
    now() + interval '5 hours',
    array['Tennis Club Antibes'],
    'Cessole'
  );
