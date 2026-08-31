-- Entrenamientos largos: 2 GB por vídeo. La carga se realiza por TUS en
-- fragmentos reanudables, manteniendo el bucket privado y sus políticas RLS.
update storage.buckets
set file_size_limit = 2147483648
where id = 'workout-videos';
