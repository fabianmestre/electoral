-- Ejecutar después de 025_gestiones_ajustes.sql.
-- Historial de envíos de Comunicaciones (SMS por Hablame). Solo el backend (service role)
-- escribe y lee: el admin lo consulta a través de /api/comunicaciones.
begin;

create table if not exists public.comunicaciones (
  id uuid primary key default gen_random_uuid(),
  canal text not null check (canal in ('SMS', 'WhatsApp', 'Email', 'Llamada')),
  mensaje text not null check (length(trim(mensaje)) between 1 and 1000),
  segmento text check (segmento is null or length(segmento) <= 500),
  total integer not null default 0 check (total >= 0),
  enviados integer not null default 0 check (enviados >= 0),
  fallidos integer not null default 0 check (fallidos >= 0),
  omitidos integer not null default 0 check (omitidos >= 0),
  -- Un elemento por destinatario: { simpatizanteId, nombre, numero, estado, smsId | error }
  detalle jsonb not null default '[]'::jsonb,
  creado_por uuid not null references public.users(id),
  creado_en timestamptz not null default now()
);
create index if not exists comunicaciones_creado_en_idx on public.comunicaciones (creado_en desc);

alter table public.comunicaciones enable row level security;
revoke all on public.comunicaciones from anon, authenticated;
grant all on public.comunicaciones to service_role;

notify pgrst, 'reload schema';
commit;
