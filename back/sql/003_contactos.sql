-- Directorio general de contactos. Ejecutar después de 001_users.sql.
-- No inserta datos de personas.
begin;

create table public.contactos (
  id uuid primary key default gen_random_uuid(),
  nombres text not null check (length(trim(nombres)) between 1 and 100),
  apellidos text not null check (length(trim(apellidos)) between 1 and 100),
  telefono text check (
    telefono is null or (
      length(telefono) <= 30 and telefono ~ '^\+?[0-9 ()-]+$'
      and length(regexp_replace(telefono, '[^0-9]', '', 'g')) between 7 and 15
    )
  ),
  correo text check (
    correo is null or (length(correo) <= 254 and correo ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  ),
  direccion text check (direccion is null or length(direccion) <= 300),
  consentimiento_contacto boolean not null,
  consentimiento_fecha timestamptz,
  creado_por uuid not null default auth.uid() references public.users(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint contactos_medio_contacto check (telefono is not null or correo is not null),
  constraint contactos_consentimiento_fecha check (
    (consentimiento_contacto and consentimiento_fecha is not null)
    or (not consentimiento_contacto and consentimiento_fecha is null)
  )
);

create index contactos_creador_fecha_idx on public.contactos (creado_por, creado_en desc, id);
create index contactos_fecha_idx on public.contactos (creado_en desc, id);

create schema if not exists private;
create function private.contactos_actualizar_tiempos()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.actualizado_en := now();
  if tg_op = 'INSERT' then
    new.consentimiento_fecha := case when new.consentimiento_contacto then now() else null end;
  elsif new.consentimiento_contacto is distinct from old.consentimiento_contacto then
    new.consentimiento_fecha := case when new.consentimiento_contacto then now() else null end;
  else
    new.consentimiento_fecha := old.consentimiento_fecha;
  end if;
  return new;
end;
$$;
revoke all on function private.contactos_actualizar_tiempos() from public, anon, authenticated;

create trigger contactos_tiempos
before insert or update on public.contactos
for each row execute function private.contactos_actualizar_tiempos();

alter table public.contactos enable row level security;
revoke all on public.contactos from anon, authenticated;
grant select, delete on public.contactos to authenticated;
grant insert (nombres, apellidos, telefono, correo, direccion, consentimiento_contacto)
  on public.contactos to authenticated;
grant update (nombres, apellidos, telefono, correo, direccion, consentimiento_contacto)
  on public.contactos to authenticated;
grant all on public.contactos to service_role;

-- Se consulta el perfil propio en users, protegido por su RLS existente.
-- Admin o permiso datos: todos los contactos. Padrino: únicamente los propios.
create policy contactos_leer on public.contactos for select to authenticated
using (exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol = 'admin' or 'datos' = any(u.permisos)
      or (u.rol = 'padrino' and creado_por = (select auth.uid())))
));

create policy contactos_crear on public.contactos for insert to authenticated
with check (creado_por = (select auth.uid()) and exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol in ('admin', 'padrino') or 'datos' = any(u.permisos))
));

create policy contactos_editar on public.contactos for update to authenticated
using (exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol = 'admin' or 'datos' = any(u.permisos)
      or (u.rol = 'padrino' and creado_por = (select auth.uid())))
))
with check (exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol = 'admin' or 'datos' = any(u.permisos)
      or (u.rol = 'padrino' and creado_por = (select auth.uid())))
));

create policy contactos_eliminar on public.contactos for delete to authenticated
using (exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol = 'admin' or 'datos' = any(u.permisos)
      or (u.rol = 'padrino' and creado_por = (select auth.uid())))
));

notify pgrst, 'reload schema';
commit;
