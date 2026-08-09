-- ============================================================
-- Coach Merche App — Datos iniciales
--
-- Solo se siembran los NIVELES DE RECOMPENSA, que son
-- configurables después desde el panel de admin.
--
-- Las clases, entrenamientos y publicaciones NO se siembran:
-- los creará Merche desde la aplicación.
-- ============================================================

insert into public.rewards (name, description, icon, required_workouts, reward_type)
values
  ('Primer paso', 'Has empezado. Eso ya es mucho.', '🌱', 1, 'digital'),
  ('En marcha', 'La constancia empieza aquí.', '⚡', 5, 'digital'),
  ('Constancia', 'Ya es parte de tu rutina.', '💚', 10, 'digital'),
  ('Imparable', 'No hay quien te pare.', '🔥', 15, 'physical'),
  ('Superación', 'Has ido más allá.', '⭐', 25, 'experience'),
  ('Power Woman', 'Fuerza y cabeza.', '🏆', 40, 'physical'),
  ('Coach Merche Elite', 'Del grupo de las que siempre están.', '👑', 50, 'experience'),
  ('Leyenda', 'Esto ya son palabras mayores.', '💎', 75, 'physical'),
  ('100 Club', 'Cien entrenamientos. Enorme.', '👑', 100, 'experience')
on conflict (name) do nothing;
