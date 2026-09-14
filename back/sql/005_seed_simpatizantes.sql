-- Datos de prueba (demo) para el Directorio de Simpatizantes.
-- Ejecutar en el SQL Editor de Supabase, después de 004_simpatizantes.sql y 007_lideres.sql.
-- Reejecutable: primero borra el lote de prueba anterior (observacion = 'SEED_DEMO')
-- y genera uno nuevo, para poder "recargar" la demo las veces que haga falta.
--
-- IMPORTANTE: selecciona TODO el script (Ctrl+A) y ejecútalo completo (Run / Ctrl+Enter).
-- No lo ejecutes por partes: el editor de Supabase puede abrir una conexión distinta en
-- cada ejecución parcial, y las tablas temporales no sobreviven entre conexiones.
begin;

delete from public.simpatizantes where observacion = 'SEED_DEMO';

do $$
declare
  lideres_ids uuid[];
  lideres_padrinos uuid[];
  idx_lider int;
  nombres text[] := array[
    'Juan','María','Carlos','Ana','Luis','Sofía','Andrés','Valentina','Jorge','Camila',
    'Pedro','Daniela','Miguel','Isabella','Fernando','Laura','Diego','Natalia','Santiago','Gabriela',
    'Ricardo','Mariana','Alejandro','Paula','Héctor','Diana','Oscar','Carolina','Cristian','Luisa'
  ];
  apellidos text[] := array[
    'García','Rodríguez','Martínez','López','González','Pérez','Sánchez','Ramírez','Torres','Flores',
    'Rojas','Díaz','Vargas','Castro','Mendoza','Morales','Ortiz','Herrera','Medina','Aguilar'
  ];
  ocupaciones text[] := array[
    'Comerciante','Independiente','Empleado','Ama de casa','Estudiante',
    'Transportador','Agricultor','Docente','Vendedor(a)','Pensionado'
  ];
  intereses_op text[] := array[
    'Deporte','Empleo','Infraestructura','Educación','Salud','Cultura','Medio Ambiente','Vivienda','Emprendimiento','Juventud'
  ];
  profesiones_op text[] := array[
    'Abogado/a','Ingeniero/a','Médico/a','Contador/a','Enfermero/a','Docente','Administrador/a',
    'Economista','Arquitecto/a','Psicólogo/a','Comunicador/a','Odontólogo/a','Trabajador/a Social',
    'Veterinario/a','Diseñador/a'
  ];
  pu record;
  nuevo_id uuid;
  mesas_en_puesto int;
  i int;
  v int;
  n_vehiculos int;
  nr double precision;
  pr double precision;
  v_nivel text;
  v_profesion text;
  v_posgrado text;
begin
  select array_agg(id order by id), array_agg(padrino_id order by id)
  into lideres_ids, lideres_padrinos
  from public.lideres where activo;

  if lideres_ids is null or array_length(lideres_ids, 1) = 0 then
    raise exception 'No hay líderes activos. Ejecuta 007_lideres.sql antes de esta semilla.';
  end if;

  for i in 1..150 loop
    -- Catálogo de puestos de Valledupar, en línea (sin tabla temporal: más robusto
    -- frente a ejecuciones parciales / distintas conexiones del editor SQL).
    select * into pu from (values
      ('PV01', 'Urbana', 'Comuna 1', 'Centro', 101),
      ('PV02', 'Urbana', 'Comuna 1', 'Centro', 201),
      ('PV03', 'Urbana', 'Comuna 1', 'Cañaguate', 301),
      ('PV04', 'Urbana', 'Comuna 2', 'San Joaquín', 401),
      ('PV05', 'Urbana', 'Comuna 2', 'Los Cortijos', 501),
      ('PV06', 'Urbana', 'Comuna 2', 'Nueve de Octubre', 601),
      ('PV07', 'Urbana', 'Comuna 3', 'La Nevada', 701),
      ('PV08', 'Urbana', 'Comuna 3', 'El Carmen', 801),
      ('PV09', 'Urbana', 'Comuna 4', 'Doce de Octubre', 901),
      ('PV10', 'Urbana', 'Comuna 4', 'Mayales', 1001),
      ('PV11', 'Urbana', 'Comuna 4', 'Mayales', 1101),
      ('PV12', 'Urbana', 'Comuna 5', 'Villa Castro', 1201),
      ('PV13', 'Urbana', 'Comuna 5', 'Garupal', 1301),
      ('PV14', 'Urbana', 'Comuna 6', 'Primero de Mayo', 1401),
      ('PV15', 'Urbana', 'Comuna 6', 'La Esperanza', 1501),
      ('PV16', 'Rural', 'Patillal', 'Patillal Centro', 1601),
      ('PV17', 'Rural', 'La Mina', 'La Mina Centro', 1701),
      ('PV18', 'Rural', 'Los Venados', 'Los Venados Centro', 1801),
      ('PV19', 'Rural', 'Guacoche', 'Guacoche Centro', 1901),
      ('PV20', 'Rural', 'Valencia de Jesús', 'Valencia Centro', 2001),
      ('PV21', 'Rural', 'Aguas Blancas', 'Aguas Blancas Centro', 2101)
    ) as t(id, zona, sector, barrio, mesa_base)
    order by random() limit 1;

    -- Escogemos un líder (y su padrino, para creado_por) por índice en memoria: nada de
    -- una segunda consulta por fila, para que no dependa de una sub-consulta aparte.
    idx_lider := 1 + floor(random() * array_length(lideres_ids, 1))::int;

    mesas_en_puesto := case when pu.zona = 'Rural' then 4 else 6 end;
    nuevo_id := gen_random_uuid();

    -- Nivel académico / profesión / posgrado con la misma distribución que la demo original:
    -- ~5% sin estudios, 8% primaria, 45% bachiller, 20% técnico, 12% tecnólogo, 10% profesional.
    nr := random();
    v_nivel := case
      when nr < 0.05 then 'Sin estudios'
      when nr < 0.13 then 'Primaria'
      when nr < 0.58 then 'Bachiller'
      when nr < 0.78 then 'Técnico'
      when nr < 0.90 then 'Tecnólogo'
      else 'Profesional'
    end;
    v_profesion := case
      when v_nivel in ('Técnico', 'Tecnólogo', 'Profesional')
        then profesiones_op[1 + floor(random() * array_length(profesiones_op, 1))::int]
      else 'Sin profesión'
    end;
    pr := random();
    v_posgrado := case
      when v_nivel = 'Profesional' and pr < 0.20 then 'Especialización'
      when v_nivel = 'Profesional' and pr < 0.35 then 'Maestría'
      when v_nivel = 'Profesional' and pr < 0.40 then 'Doctorado'
      else 'Ninguno'
    end;

    insert into public.simpatizantes (
      id, nombres, apellidos, cedula, fecha_nacimiento, telefono, correo, direccion,
      departamento, municipio, zona, comuna, corregimiento, barrio, puesto, mesa,
      intereses, grupos_sociales, ocupacion, profesion, nivel_academico, posgrado, observacion,
      lider_id, nivel_voto, rol_dia_e, habeas_data, creado_por
    ) values (
      nuevo_id,
      nombres[1 + floor(random() * array_length(nombres, 1))::int],
      apellidos[1 + floor(random() * array_length(apellidos, 1))::int]
        || ' ' || apellidos[1 + floor(random() * array_length(apellidos, 1))::int],
      (100000000 + floor(random() * 899999999))::bigint::text,
      (current_date - make_interval(years => 18 + floor(random() * 55)::int, days => floor(random() * 300)::int))::date,
      '3' || lpad(floor(random() * 999999999)::bigint::text, 9, '0'),
      case when random() < 0.6 then 'simpatizante' || floor(random() * 99999)::int::text || '@correo.com' end,
      case when random() < 0.5 then
        (array['Calle', 'Carrera', 'Diagonal', 'Transversal'])[1 + floor(random() * 4)::int]
          || ' ' || (1 + floor(random() * 80))::int::text
          || ' # ' || (1 + floor(random() * 80))::int::text
          || '-' || (1 + floor(random() * 90))::int::text
      end,
      'Cesar', 'Valledupar', pu.zona,
      case when pu.zona = 'Urbana' then pu.sector end,
      case when pu.zona = 'Rural' then pu.sector end,
      pu.barrio, pu.id, pu.mesa_base + floor(random() * mesas_en_puesto)::int,
      (select array_agg(intereses_op[1 + floor(random() * array_length(intereses_op, 1))::int])
       from generate_series(1, 2 + floor(random() * 3)::int)),
      '{}',
      ocupaciones[1 + floor(random() * array_length(ocupaciones, 1))::int],
      v_profesion, v_nivel, v_posgrado, 'SEED_DEMO',
      lideres_ids[idx_lider], (array['Firme', 'Firme', 'Indeciso', 'En Riesgo'])[1 + floor(random() * 4)::int], 'Votante',
      true, lideres_padrinos[idx_lider]
    );

    if random() < 0.35 then
      n_vehiculos := 1 + floor(random() * 2)::int;
      for v in 1..n_vehiculos loop
        insert into public.simpatizante_vehiculos (simpatizante_id, tipo, capacidad_pasajeros, a_disposicion, estado)
        values (
          nuevo_id,
          (array['Moto', 'Automóvil', 'Camioneta', 'Bus'])[1 + floor(random() * 4)::int],
          1 + floor(random() * 8)::int,
          random() < 0.7,
          'Disponible'
        );
      end loop;
    end if;
  end loop;
end $$;

commit;

select zona, count(*) as total
from public.simpatizantes where observacion = 'SEED_DEMO'
group by zona order by zona;
