-- Datos de prueba (demo) para Trazabilidad de Gestiones.
-- Ejecutar en el SQL Editor de Supabase, después de 005_seed_simpatizantes.sql y 010_gestiones.sql.
-- Reejecutable: primero borra el lote de prueba anterior (descripción termina en
-- "[SEED_DEMO]") y genera uno nuevo, para poder "recargar" la demo las veces que haga falta.
--
-- IMPORTANTE: selecciona TODO el script (Ctrl+A) y ejecútalo completo (Run / Ctrl+Enter).
begin;

delete from public.gestiones where descripcion like '%[SEED_DEMO]';

do $$
declare
  sim_ids uuid[];
  sim_creadores uuid[];
  idx_sim int;
  categorias text[] := array['Salud', 'Empleo', 'Ayudas/Mercados', 'Recursos/Dinero', 'Trámites/Asesoría', 'Obras comunitarias'];
  montos int[] := array[50000, 85000, 120000, 180000, 250000, 320000, 400000];
  v_categoria text;
  v_descripcion text;
  v_responsable text;
  v_monto int;
  v_estado text;
  r double precision;
  i int;
begin
  -- creado_por debe ser un public.users válido (no NULL): tomamos el mismo creado_por
  -- que ya tiene el simpatizante (el padrino que lo registró), en vez de confiar en el
  -- default auth.uid() de la tabla, que es NULL al ejecutar desde el editor SQL.
  select array_agg(id order by id), array_agg(creado_por order by id)
  into sim_ids, sim_creadores
  from public.simpatizantes where observacion = 'SEED_DEMO';

  if sim_ids is null or array_length(sim_ids, 1) = 0 then
    raise exception 'No hay simpatizantes de prueba. Ejecuta 005_seed_simpatizantes.sql antes de esta semilla.';
  end if;

  for i in 1..120 loop
    v_categoria := categorias[1 + floor(random() * array_length(categorias, 1))::int];

    v_responsable := case v_categoria
      when 'Salud' then 'Comité de Salud'
      when 'Empleo' then 'Gestión Humana'
      when 'Ayudas/Mercados' then 'Comité Social'
      when 'Recursos/Dinero' then 'Finanzas'
      when 'Trámites/Asesoría' then 'Asesoría Legal'
      else 'Obras Públicas'
    end;

    select descripcion into v_descripcion from (values
      ('Salud', 'Gestión de cita médica prioritaria en EPS'),
      ('Salud', 'Apoyo para entrega de medicamentos'),
      ('Salud', 'Trámite de remisión a especialista'),
      ('Salud', 'Acompañamiento para cirugía programada'),
      ('Salud', 'Gestión de autorización de exámenes'),
      ('Empleo', 'Vinculación a vacante en obra municipal'),
      ('Empleo', 'Postulación a programa de empleo'),
      ('Empleo', 'Recomendación de hoja de vida'),
      ('Empleo', 'Gestión de contrato temporal'),
      ('Empleo', 'Vinculación a ruta de emprendimiento'),
      ('Ayudas/Mercados', 'Entrega de mercado mensual'),
      ('Ayudas/Mercados', 'Kit de aseo e higiene'),
      ('Ayudas/Mercados', 'Ayuda alimentaria de emergencia'),
      ('Ayudas/Mercados', 'Entrega de útiles escolares'),
      ('Ayudas/Mercados', 'Mercado para adulto mayor'),
      ('Recursos/Dinero', 'Apoyo económico para transporte'),
      ('Recursos/Dinero', 'Aporte para arriendo'),
      ('Recursos/Dinero', 'Microcrédito rotativo'),
      ('Recursos/Dinero', 'Ayuda para matrícula escolar'),
      ('Recursos/Dinero', 'Apoyo para emprendimiento'),
      ('Trámites/Asesoría', 'Asesoría en trámite de pensión'),
      ('Trámites/Asesoría', 'Orientación para subsidio de vivienda'),
      ('Trámites/Asesoría', 'Trámite de registro civil'),
      ('Trámites/Asesoría', 'Asesoría jurídica'),
      ('Trámites/Asesoría', 'Acompañamiento en trámite de Sisbén'),
      ('Obras comunitarias', 'Gestión de arreglo de vía'),
      ('Obras comunitarias', 'Solicitud de luminarias'),
      ('Obras comunitarias', 'Reparación de acueducto'),
      ('Obras comunitarias', 'Construcción de salón comunal'),
      ('Obras comunitarias', 'Mantenimiento de parque')
    ) as t(categoria, descripcion)
    where categoria = v_categoria
    order by random() limit 1;

    v_monto := case
      when v_categoria in ('Recursos/Dinero', 'Ayudas/Mercados') then montos[1 + floor(random() * array_length(montos, 1))::int]
      else 0
    end;

    r := random();
    v_estado := case
      when r < 0.40 then 'Resuelto'
      when r < 0.65 then 'En Proceso'
      when r < 0.90 then 'Pendiente'
      else 'Cancelado'
    end;

    idx_sim := 1 + floor(random() * array_length(sim_ids, 1))::int;

    insert into public.gestiones (
      simpatizante_id, fecha, categoria, descripcion, monto, estado, responsable, creado_por
    ) values (
      sim_ids[idx_sim],
      current_date - floor(random() * 30)::int,
      v_categoria,
      v_descripcion || ' [SEED_DEMO]',
      v_monto,
      v_estado,
      v_responsable,
      sim_creadores[idx_sim]
    );
  end loop;
end $$;

commit;

select categoria, count(*) as total, sum(monto) as invertido
from public.gestiones where descripcion like '%[SEED_DEMO]'
group by categoria order by categoria;
