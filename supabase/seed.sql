-- Seed: default organization for Start Academy
insert into public.organizations (id, name, invite_code)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Start Academy',
  'START-2026'
);

-- Seed: default team
insert into public.teams (id, org_id, name)
values (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Équipe Demo'
);

-- Seed: default ratio configs for Start Academy (7 ratios)
insert into public.ratio_configs (org_id, ratio_id, thresholds) values
  ('a0000000-0000-0000-0000-000000000001', 'contacts_rdv', '{"debutant": 20, "confirme": 15, "expert": 10}'),
  ('a0000000-0000-0000-0000-000000000001', 'estimations_mandats', '{"debutant": 4, "confirme": 2, "expert": 1.5}'),
  ('a0000000-0000-0000-0000-000000000001', 'pct_mandats_exclusifs', '{"debutant": 30, "confirme": 50, "expert": 70}'),
  ('a0000000-0000-0000-0000-000000000001', 'visites_offre', '{"debutant": 12, "confirme": 10, "expert": 8}'),
  ('a0000000-0000-0000-0000-000000000001', 'offres_compromis', '{"debutant": 3, "confirme": 2, "expert": 1.5}'),
  ('a0000000-0000-0000-0000-000000000001', 'mandats_simples_vente', '{"debutant": 8, "confirme": 6, "expert": 4}'),
  ('a0000000-0000-0000-0000-000000000001', 'mandats_exclusifs_vente', '{"debutant": 3, "confirme": 2, "expert": 1.5}');
