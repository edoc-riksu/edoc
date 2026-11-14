-- Idempotent: safe to run on every environment, including production.
-- Ids must match the keys of pilotProgress in src/context/PilotContext.js.
insert into sectors (id, name, sort_order) values
  ('Python Engine Core',    'Python Propulsion',      1),
  ('JavaScript Engine',     'JavaScript Core',        2),
  ('TypeScript Array',      'TypeScript Lattice',     3),
  ('Go Engine Subsystem',   'Go Cryo-System',         4),
  ('Rust Core Defense',     'Rust Iron Desert',       5),
  ('SQL Relational Matrix', 'SQL Relational Matrix',  6)
on conflict (id) do update
  set name = excluded.name, sort_order = excluded.sort_order;
