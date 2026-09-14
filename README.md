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
