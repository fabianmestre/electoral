# CRM Electoral — Campaña al Concejo de Valledupar (Cesar · Colombia)

Prototipo técnico funcional construido con **React 19 + TypeScript + Vite + Tailwind CSS 4 + lucide-react + motion**.

## Modelo de datos
- Jerarquía: **Departamento → Municipio → (Comuna | Corregimiento) → Barrio → Puesto de votación** (1 o varios puestos por barrio, cada uno con mesas).
- **Regla de validez**: solo vota en el Concejo de Valledupar quien está censado en `Cesar + Valledupar`. Los registros de otros municipios o departamentos se marcan como **error del líder**.
- Mock determinista: **6 líderes**, **500 simpatizantes**, censo de **726 cédulas**, **40 gestiones**, **27 puestos de votación**.

## Requisitos
- Node.js 18+

## Instalación y ejecución
```bash
npm install
npm run dev        # http://localhost:3001
```

> El puerto **3001** se usa para no chocar con `glovall-b2b` (que corre en el 3000).

## Verificación de tipos y build
```bash
npm run typecheck  # tsc --noEmit
npm run build      # tsc --noEmit && vite build
```

## Accesos (RBAC)
| Rol | Correo | Clave |
| --- | --- | --- |
| Administrador | admin@campana.com | admin123 |
| Líder 1 · Comunas 1–2 | lider1@campana.com | lider123 |
| Líder 2 · Comunas 3–4 | lider2@campana.com | lider123 |
| Líder 3 · Comunas 5–6 | lider3@campana.com | lider123 |
| Líder 4 · Corregimientos Norte | lider4@campana.com | lider123 |
| Líder 5 · Corregimientos Sur | lider5@campana.com | lider123 |
| Líder 6 · Zona mixta (control débil) | lider6@campana.com | lider123 |

Los datos se generan de forma determinista y persisten en `localStorage`.
