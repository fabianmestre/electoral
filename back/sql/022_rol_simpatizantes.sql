-- Ejecutar después de 021_gestores.sql. No elimina datos.
-- Toda persona se registra primero como simpatizante; el rol la clasifica y le da
-- funciones. Todos votan, independiente del rol.
begin;

alter table public.simpatizantes add column if not exists rol text not null default 'simpatizante'
  check (rol in ('simpatizante', 'lider', 'padrino', 'gestor', 'digitador'));
create index if not exists simpatizantes_rol_idx on public.simpatizantes (rol);

-- rol no se concede para INSERT/UPDATE a authenticated: solo el backend (admin) lo cambia.
notify pgrst, 'reload schema';
commit;
