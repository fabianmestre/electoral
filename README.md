# CRM Electoral

El proyecto se organiza en dos carpetas:

- `front/`: aplicación React, TypeScript, Vite y Tailwind CSS.
- `back/`: servidor Node.js con módulos ES y HTTP nativo.

## Frontend

```bash
cd front
npm install
npm run dev
```

Disponible en http://localhost:3001. Para compilar: `npm run build`.
Consulta `front/README.md` para los detalles y accesos del prototipo.

## Backend

Requiere Node.js 20.12 o superior. No tiene dependencias externas.
Configura `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` en `back/.env`.

```bash
cd back
npm run dev
```

Disponible en http://localhost:3002. La variable de entorno `PORT` permite cambiar el puerto.
`GET /api/health` devuelve `{ "status": "ok" }`.
Para ejecutar sin modo de desarrollo: `npm start`.

El login usa correo y contraseña a través de `/api/auth/login` y Supabase Auth.
El perfil activo y su rol se consultan en `public.users` con las políticas RLS.
La sesión se conserva en la pestaña hasta que venza el token o se cierre sesión.
Vite redirige `/api` al backend durante el desarrollo.

Ejecuta `back/sql/001_users.sql` y después `back/sql/002_seed_users.sql` en Supabase.
El segundo script crea las cinco cuentas iniciales con contraseña `123456`.
Los demás módulos del frontend todavía usan sus datos locales.

## Despliegue con Docker

Copia `.env.docker.example` como `.env` en la raíz y completa las tres variables
de Supabase. Después construye e inicia ambos contenedores:

```bash
docker compose up -d --build
```

La aplicación queda disponible en `http://localhost:3001`. Puedes cambiar el
puerto publicado con `APP_PORT`. Nginx sirve el frontend y envía `/api` al
backend por la red interna de Compose. Para revisar el estado usa
`docker compose ps` y para detener el despliegue `docker compose down`.

### Coolify

En una aplicación conectada al repositorio selecciona **Docker Compose** como
Build Pack, usa `/` como Base Directory y `/docker-compose.coolify.yml` como
Docker Compose Location. En Environment Variables registra `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`; las tres son variables de
runtime y la clave secreta debe marcarse como Secret. Asigna el dominio público
únicamente al servicio `front`, que escucha en el puerto interno 80. El servicio
`back` permanece privado y Nginx le envía las solicitudes `/api`.

## Digitadores

Ejecuta `back/sql/013_digitadores.sql` después de las migraciones anteriores.
El administrador crea y activa cuentas desde el módulo Digitador, con correo y
cédula obligatorios. La contraseña inicial es la cédula.
El digitador puede registrar y corregir fichas para todos los líderes, indicando
el código de planilla. No administra cuentas, líderes ni elimina simpatizantes.
El padrino de cada líder puede consultar y completar esas fichas desde Simpatizantes.

## Borrado masivo

Solo el administrador puede usar «Borrar todos» en Padrinos y Líderes.
Ejecuta `back/sql/014_borrar_padrinos.sql` para habilitar el borrado atómico de
las cuentas y perfiles de padrinos. Crear la función no elimina registros.
El borrado se bloquea si existen datos relacionados y requiere escribir BORRAR
en el modal de confirmación.

## Cargue de padrinos

Ejecuta `back/sql/015_campos_padrinos.sql` para agregar número, celular, dirección
y barrio. Luego ejecuta `back/sql/016_cargue_padrinos.sql` para cargar los ocho
padrinos de la planilla. Las nuevas cuentas con correo usan la cédula como
contraseña inicial. Los padrinos sin correo quedan sin acceso al login.
Reejecutar el cargue no duplica padrinos ni cambia contraseñas existentes.

## Acceso de líderes

Ejecuta `back/sql/017_acceso_lideres.sql`. El formulario de líderes pide nombres,
apellidos, correo, cédula y padrino asociado. Al guardar un líder con correo se
crea su cuenta de acceso, con la cédula como contraseña inicial. El líder puede
registrar y corregir únicamente sus propios simpatizantes. Los líderes anteriores
sin correo conservan sus registros y quedan sin acceso hasta completar el correo.
Editar la ficha no cambia una contraseña que el líder ya haya personalizado.

## Origen de simpatizantes

Ejecuta `back/sql/018_trazabilidad_simpatizantes.sql`. Cada nuevo registro guarda
automáticamente el usuario que lo digitó, el líder, el padrino y la fecha iniciales.
La base de datos conserva ese origen al editar o reasignar la ficha. Las columnas
Líder y Padrino muestran la asociación actual; Registrado por muestra su origen.
Los registros anteriores no reciben un origen reconstruido.

## Captura de planillas

Ejecuta `back/sql/019_captura_planillas_digitador.sql`. La captura rápida del
digitador replica las columnas de la planilla: número, nombre y apellidos,
cédula, celular, dirección, barrio, lugar de votación, mesa y vehículo. El líder
se selecciona antes de guardar y el padrino se obtiene de esa asociación. Los
datos que la planilla no contiene quedan pendientes; no se inventa fecha de
nacimiento, zona ni autorización de tratamiento de datos.

Ejecuta después `back/sql/020_captura_reducida_lider.sql`. El formulario del
líder omite departamento, lugar de votación y mesa; esos datos quedan pendientes.
El digitador conserva la captura completa de esos campos.

## Gestores de información

Ejecuta `back/sql/021_gestores.sql`. El administrador puede crear cuentas de
Gestor con correo y cédula; la cédula es la contraseña inicial. El Gestor entra
al directorio completo de simpatizantes y puede consultar, completar y editar
cualquier ficha. No puede eliminar fichas ni acceder a los demás módulos.
