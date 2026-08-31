import { useState } from 'react'
import {
  Car,
  ChevronsLeft,
  ChevronsRight,
  Gauge,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp, type ViewId } from '../store'
import type { UserRole } from '../types'
import { territorioDeLider } from '../data'
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
import Perfil from './Perfil'
import LiderDash from '../views/LiderDash'
import Captura from '../views/Captura'
import LiderSimpatizantes from '../views/LiderSimpatizantes'
import LiderGestiones from '../views/LiderGestiones'

interface NavItem {
  id: ViewId
  label: string
  sub: string
  icon: LucideIcon
}

const NAV: Record<UserRole, NavItem[]> = {
  admin: [
    { id: 'dashboard', label: 'Dashboard Analítico', sub: 'Métricas globales y legal', icon: LayoutDashboard },
    { id: 'directorio', label: 'Directorio de Simpatizantes', sub: 'Fichas técnicas', icon: Users },
    { id: 'talento', label: 'Mapa de Talento', sub: 'Profesionales para comités', icon: GraduationCap },
    { id: 'lideres', label: 'Red de Líderes y Metas', sub: 'Meta vs votos válidos', icon: Trophy },
    { id: 'gestiones', label: 'Trazabilidad de Gestiones', sub: 'Favores, compromisos y balance', icon: Handshake },
    { id: 'comunicaciones', label: 'Comunicaciones Omnicanal', sub: 'Envíos masivos segmentados', icon: Send },
    { id: 'logistica', label: 'Centro de Mando — Día E', sub: 'Votos, líderes, transporte y censo', icon: Car },
  ],
  lider: [
    { id: 'lider-dash', label: 'Mi Progreso', sub: 'Avance vs meta de votos', icon: Gauge },
    { id: 'captura', label: 'Captura Rápida', sub: 'Registro móvil en campo', icon: PlusCircle },
    { id: 'lider-simpatizantes', label: 'Mis Simpatizantes', sub: 'Fichas y gestiones', icon: Users },
    { id: 'lider-gestiones', label: 'Gestiones de mi zona', sub: 'Registrar y trazabilidad', icon: Handshake },
  ],
}

const TITLES: Record<ViewId, string> = {
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
  'lider-dash': 'Mi Progreso',
  captura: 'Captura Rápida',
  'lider-simpatizantes': 'Mis Simpatizantes',
  'lider-gestiones': 'Gestiones de mi zona',
}

function renderView(view: ViewId) {
  switch (view) {
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
    case 'lider-dash':
      return <LiderDash />
    case 'captura':
      return <Captura />
    case 'lider-simpatizantes':
      return <LiderSimpatizantes />
    case 'lider-gestiones':
      return <LiderGestiones />
  }
}

export default function Layout() {
  const { session, view, navigate, logout, resetDatos } = useApp()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  if (!session) return null
  const items = NAV[session.rol]

  const topBadge =
    session.rol === 'admin'
      ? '🌐 Acceso Total'
      : `📍 ${territorioDeLider(session.liderId ?? '')}`
  const zoneTone = session.rol === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-200 z-40 transition-all ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${collapsed ? 'lg:w-16' : 'lg:w-64'}`}
      >
        <div className={`flex items-center gap-3 h-16 border-b border-slate-800 ${collapsed ? 'lg:justify-center lg:px-0' : 'px-5'}`}>
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
        <nav className="px-3 py-4 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
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
        <div className="absolute bottom-0 inset-x-0 p-3 border-t border-slate-800 space-y-1">
          <button
            onClick={resetDatos}
            title={collapsed ? 'Restablecer datos de prueba' : undefined}
            className={`w-full flex items-center gap-2 text-[11px] text-slate-400 hover:text-white px-2 py-1.5 rounded transition ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Restablecer datos de prueba</span>
          </button>
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
            <h2 className="font-bold text-slate-900 truncate">{TITLES[view]}</h2>
            <p className="text-[11px] text-slate-500 truncate">
              {(items.find((i) => i.id === view) || {}).sub ?? ''}
            </p>
          </div>
          <Badge className={`${zoneTone} max-w-[220px] truncate`}>{topBadge}</Badge>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-2 font-medium shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" /> Cambiar usuario
          </button>
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
