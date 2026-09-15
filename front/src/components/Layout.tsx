import { useState } from 'react'
import {
  Car,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  Menu,
  // MapPin,
  RotateCcw,
  Send,
  ShieldCheck,
  Trophy,
  UserCog,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp, type ViewId } from '../store'
import type { UserRole } from '../types'
import { nombrePadrino } from '../data'
import { Badge } from './ui'
import Dashboard from '../views/Dashboard'
import Lideres from '../views/Lideres'
import Gestiones from '../views/Gestiones'
import Comunicaciones from '../views/Comunicaciones'
import Logistica from '../views/Logistica'
import Censo from '../views/Censo'
import Directorio from '../views/Directorio'
import Talento from '../views/Talento'
import Legal from '../views/Legal'
import ConsultaPuesto from '../views/ConsultaPuesto'
import Perfil from './Perfil'
import SimpatizanteDetalle from '../views/SimpatizanteDetalle'
import PadrinoDash from '../views/PadrinoDash'
import PadrinoPlanillas from '../views/PadrinoPlanillas'
import PadrinoSimpatizantes from '../views/PadrinoSimpatizantes'
import PadrinosAdmin from '../views/PadrinosAdmin'
import GestionLideres from '../views/GestionLideres'
import Digitador from '../views/Digitador'
import GestoresAdmin from '../views/GestoresAdmin'
import AccountMenu from './AccountMenu'

interface NavItem {
  id: ViewId
  label: string
  sub: string
  icon: LucideIcon
}

const NAV: Record<UserRole, NavItem[]> = {
  lider: [{ id: 'digitador', label: 'Mis simpatizantes', sub: 'Registro y actualización de mis fichas', icon: Users }],
  admin: [
    { id: 'digitador', label: 'Digitador', sub: 'Cuentas y captura de planillas', icon: ClipboardList },
    { id: 'gestores', label: 'Gestores', sub: 'Cuentas para completar fichas', icon: UserCog },
    // { id: 'consulta-puesto', label: 'Consulta puesto', sub: 'Lugar de votación oficial', icon: MapPin },
    { id: 'dashboard', label: 'Dashboard Analítico', sub: 'Métricas globales y legal', icon: LayoutDashboard },
    { id: 'directorio', label: 'Directorio de Simpatizantes', sub: 'Fichas técnicas', icon: Users },
    { id: 'lideres', label: 'Red de Líderes y Metas', sub: 'Meta vs votos válidos', icon: Trophy },
    { id: 'padrinos', label: 'Padrinos', sub: 'Asignación y mesa de datos', icon: UserCog },
    { id: 'gestion-lideres', label: 'Líderes', sub: 'Registro y edición de líderes', icon: UserPlus },
    { id: 'gestiones', label: 'Trazabilidad de Gestiones', sub: 'Favores, compromisos y balance', icon: Handshake },
    { id: 'comunicaciones', label: 'Comunicaciones Omnicanal', sub: 'Envíos masivos segmentados', icon: Send },
    { id: 'logistica', label: 'Centro de Mando — Día E', sub: 'Votos, líderes, transporte y censo', icon: Car },
    { id: 'talento', label: 'Mapa de Talento', sub: 'Profesionales para comités', icon: GraduationCap },
  ],
  subadmin: [
    // { id: 'consulta-puesto', label: 'Consulta puesto', sub: 'Lugar de votación oficial', icon: MapPin },
    { id: 'dashboard', label: 'Dashboard Analítico', sub: 'Métricas globales', icon: LayoutDashboard },
    { id: 'comunicaciones', label: 'Conectividad y Comunicaciones', sub: 'Canales y envíos masivos', icon: Send },
  ],
  padrino: [
    // { id: 'consulta-puesto', label: 'Consulta puesto', sub: 'Lugar de votación oficial', icon: MapPin },
    { id: 'padrino-dash', label: 'Mis Líderes', sub: 'Apadrinamiento y seguimiento', icon: Users },
    { id: 'padrino-planillas', label: 'Planillas', sub: 'Captura y auditoría', icon: ClipboardList },
    { id: 'padrino-simpatizantes', label: 'Simpatizantes', sub: 'Gestión sobre mis líderes', icon: Users },
  ],
  digitador: [
    { id: 'digitador', label: 'Digitador', sub: 'Captura de simpatizantes y planillas', icon: ClipboardList },
  ],
  gestor: [{ id: 'directorio', label: 'Simpatizantes', sub: 'Completar y editar fichas', icon: Users }],
}

const TITLES: Record<ViewId, string> = {
  digitador: 'Digitador',
  'consulta-puesto': 'Consulta puesto',
  dashboard: 'Dashboard Analítico',
  lideres: 'Red de Líderes y Metas',
  gestiones: 'Trazabilidad de Gestiones',
  comunicaciones: 'Comunicaciones Omnicanal',
  logistica: 'Centro de Mando — Día E',
  censo: 'División Electoral',
  directorio: 'Directorio de Simpatizantes',
  talento: 'Mapa de Talento',
  legal: 'Cumplimiento Legal',
  perfil: 'Ficha Técnica',
  'simpatizante-detalle': 'Ficha del Simpatizante',
  'padrino-dash': 'Mis Líderes',
  'padrino-planillas': 'Planillas',
  'padrino-simpatizantes': 'Simpatizantes de mis líderes',
  padrinos: 'Gestión de Padrinos',
  'gestion-lideres': 'Líderes',
  gestores: 'Gestores',
}

function renderView(view: ViewId) {
  switch (view) {
    case 'digitador':
      return <Digitador />
    case 'gestores':
      return <GestoresAdmin />
    case 'consulta-puesto':
      return <ConsultaPuesto />
    case 'dashboard':
      return <Dashboard />
    case 'lideres':
      return <Lideres />
    case 'gestiones':
      return <Gestiones />
    case 'comunicaciones':
      return <Comunicaciones />
    case 'logistica':
      return <Logistica />
    case 'censo':
      return <Censo />
    case 'directorio':
      return <Directorio />
    case 'talento':
      return <Talento />
    case 'legal':
      return <Legal />
    case 'perfil':
      return <Perfil />
    case 'simpatizante-detalle':
      return <SimpatizanteDetalle />
    case 'gestion-lideres':
      return <GestionLideres />
    case 'padrino-dash':
      return <PadrinoDash />
    case 'padrino-planillas':
      return <PadrinoPlanillas />
    case 'padrino-simpatizantes':
      return <PadrinoSimpatizantes />
    case 'padrinos':
      return <PadrinosAdmin />
  }
}

export default function Layout() {
  const { db, session, view, navigate, logout, resetDatos } = useApp()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  if (!session) return null
  const items = NAV[session.rol]

  const topBadge =
    session.rol === 'admin'
      ? '🌐 Acceso Total'
      : session.rol === 'subadmin'
        ? '🔌 Conectividad y Comunicaciones'
        : session.rol === 'lider' ? 'Líder' : session.rol === 'digitador' ? 'Digitación de planillas' : session.rol === 'gestor' ? 'Gestor de fichas' : `🛡️ ${nombrePadrino(db, session.padrinoId)}`
  const zoneTone =
    session.rol === 'admin'
      ? 'bg-blue-100 text-blue-700'
      : session.rol === 'subadmin'
        ? 'bg-violet-100 text-violet-700'
        : 'bg-indigo-100 text-indigo-700'

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 flex flex-col bg-slate-900 text-slate-200 z-40 transition-all ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${collapsed ? 'lg:w-16' : 'lg:w-64'}`}
      >
        <div className={`flex items-center gap-3 h-16 shrink-0 border-b border-slate-800 ${collapsed ? 'lg:justify-center lg:px-0' : 'px-5'}`}>
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className={`${collapsed ? 'lg:hidden' : ''} flex-1 min-w-0`}>
            <div className="font-bold text-white text-sm leading-tight truncate">Concejo Valledupar</div>
            <div className="text-[10px] text-slate-400">Cesar · CRM Electoral</div>
          </div>
          <button className="lg:hidden text-slate-400" onClick={() => setOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="px-3 py-4 space-y-1 overflow-y-auto flex-1 min-h-0">
          {items.map((it) => {
            const Icon = it.icon
            const active = view === it.id
            return (
              <button
                key={it.id}
                onClick={() => {
                  navigate(it.id)
                  setOpen(false)
                }}
                title={collapsed ? it.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition ${
                  collapsed ? 'lg:justify-center lg:px-0' : ''
                } ${active ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className={`${collapsed ? 'lg:hidden' : ''} flex-1 min-w-0`}>
                  <span className="block text-sm font-medium">{it.label}</span>
                  <span className={`block text-[10px] truncate ${active ? 'text-blue-100' : 'text-slate-400'}`}>{it.sub}</span>
                </span>
              </button>
            )
          })}
        </nav>
        <div className="shrink-0 p-3 border-t border-slate-800 space-y-1">
          <button
            onClick={resetDatos}
            title={collapsed ? 'Restablecer datos de prueba' : undefined}
            className={`w-full flex items-center gap-2 text-[11px] text-slate-400 hover:text-white px-2 py-1.5 rounded transition ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Restablecer datos de prueba</span>
          </button>
          <AccountMenu session={session} collapsed={collapsed} onLogout={logout} />
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className={`${collapsed ? 'lg:pl-16' : 'lg:pl-64'} flex flex-col min-h-screen`}>
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 h-16 flex items-center gap-3 px-4">
          <button className="lg:hidden text-slate-600" onClick={() => setOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <button
            className="hidden lg:inline-flex text-slate-600 hover:text-slate-900"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Mostrar menú' : 'Ocultar menú'}
          >
            {collapsed ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-900 truncate">{session.rol === 'lider' && view === 'digitador' ? 'Mis simpatizantes' : TITLES[view]}</h2>
            <p className="text-[11px] text-slate-500 truncate">
              {(items.find((i) => i.id === view) || {}).sub ?? ''}
            </p>
          </div>
          <Badge className={`${zoneTone} max-w-[220px] truncate`}>{topBadge}</Badge>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">
          <div key={view} className="fade-in">
            {renderView(view)}
          </div>
        </main>
      </div>
    </div>
  )
}
