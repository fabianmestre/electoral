-- Ejecutar después de 021_gestores.sql. No elimina datos.
-- Toda persona se registra primero como simpatizante; el rol la clasifica y le da
-- funciones. Todos votan, independiente del rol.
begin;

alter table public.simpatizantes add column if not exists rol text not null default 'simpatizante'
  check (rol in ('simpatizante', 'lider', 'padrino', 'gestor', 'digitador'));
create index if not exists simpatizantes_rol_idx on public.simpatizantes (rol);
-- rol no se concede para INSERT/UPDATE a authenticated: solo el backend (admin) lo cambia.

-- Las fichas creadas a partir de un líder no traen teléfono ni residencia: quedan
-- como "Datos incompletos" hasta que se completen desde el modal (el backend sigue
-- exigiéndolos al crear una ficha nueva).
alter table public.simpatizantes alter column telefono drop not null;
alter table public.simpatizantes alter column municipio drop not null;
alter table public.simpatizantes alter column barrio drop not null;

-- Cada líder tiene su ficha de simpatizante con rol 'lider'. Su lider_id es él mismo,
-- así la trazabilidad muestra a su padrino en "Reporta a".
create or replace function private.lideres_asegurar_ficha()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.simpatizantes set rol = 'lider' where cedula = new.cedula and rol = 'simpatizante';
  if not found and not exists (select 1 from public.simpatizantes where cedula = new.cedula) then
    insert into public.simpatizantes (nombres, apellidos, cedula, correo, lider_id, rol, creado_por)
    values (new.nombres, new.apellidos, new.cedula, new.correo, new.id, 'lider', new.creado_por);
  end if;
  return new;
end;
$$;
revoke all on function private.lideres_asegurar_ficha() from public, anon, authenticated;
drop trigger if exists lideres_asegurar_ficha on public.lideres;
create trigger lideres_asegurar_ficha after insert on public.lideres
for each row execute function private.lideres_asegurar_ficha();

-- Líderes existentes: marcar su ficha si ya existe, o crearla.
update public.simpatizantes s set rol = 'lider'
from public.lideres l where l.cedula = s.cedula and s.rol = 'simpatizante';

insert into public.simpatizantes (nombres, apellidos, cedula, correo, lider_id, rol, creado_por)
select l.nombres, l.apellidos, l.cedula, l.correo, l.id, 'lider', l.creado_por
from public.lideres l
where not exists (select 1 from public.simpatizantes s where s.cedula = l.cedula);

notify pgrst, 'reload schema';
commit;
