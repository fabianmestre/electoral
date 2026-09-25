import type { ViewId } from '../store'

export const ROUTES: Record<ViewId, string> = {
  dashboard: '/dashboard',
  digitador: '/roles/digitador',
  'consulta-puesto': '/consulta-puesto',
  lideres: '/roles/lider',
  gestiones: '/gestiones',
  comunicaciones: '/comunicaciones',
  logistica: '/dia-e',
  censo: '/censo',
  directorio: '/roles/simpatizante/directorio',
  simpatizantes: '/roles/simpatizante/dashboard',
  talento: '/talento',
  legal: '/legal',
  perfil: '/perfil',
  'padrino-dash': '/roles/padrino/dashboard',
  'padrino-planillas': '/roles/padrino/planillas',
  'padrino-simpatizantes': '/roles/padrino/simpatizantes',
  padrinos: '/roles/padrino',
  'simpatizante-detalle': '/roles/simpatizante/detalle',
  'gestion-lideres': '/roles/lider/gestion',
  'lider-directorio': '/roles/lider/directorio',
  gestores: '/roles/gestor',
}

export const VIEW_BY_PATH = Object.fromEntries(Object.entries(ROUTES).map(([view, path]) => [path, view as ViewId])) as Record<string, ViewId>

export function viewFromPath(pathname: string): ViewId | null {
  return VIEW_BY_PATH[pathname] ?? null
}
