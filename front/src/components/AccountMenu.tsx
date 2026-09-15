import { useEffect, useRef, useState } from 'react'
import { ChevronUp, LogOut } from 'lucide-react'
import type { Usuario, UserRole } from '../types'

const ROLES: Record<UserRole, string> = {
  admin: 'Administrador', subadmin: 'Subadministrador', padrino: 'Padrino', digitador: 'Digitador', lider: 'Líder',
}

export default function AccountMenu({ session, collapsed, onLogout }: {
  session: Usuario; collapsed: boolean; onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const initials = session.nombre.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()

  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() }
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div ref={container} className="relative" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
    }}>
      {open && <div id="sidebar-account-options" aria-label="Opciones de cuenta" className={`absolute bottom-full mb-2 inset-x-0 rounded-2xl border border-slate-700 bg-slate-800 shadow-xl p-2 z-50 ${collapsed ? 'lg:left-full lg:right-auto lg:bottom-0 lg:ml-3 lg:mb-0 lg:w-64' : ''}`}>
        <div className="px-3 py-3 border-b border-slate-700 mb-1">
          <p className="text-sm font-semibold text-white truncate">{session.nombre}</p>
          <p className="text-xs text-slate-400 truncate" title={session.email}>{session.email}</p>
          <p className="text-xs text-slate-400 mt-1">{ROLES[session.rol]}</p>
        </div>
        <button type="button" onClick={() => { setOpen(false); onLogout() }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>}
      <button ref={trigger} type="button" aria-expanded={open} aria-controls={open ? 'sidebar-account-options' : undefined} aria-label={`Cuenta de ${session.nombre}`} title={collapsed ? session.nombre : undefined} onClick={() => setOpen((value) => !value)} className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${open ? 'bg-slate-800' : ''} ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">{initials || 'U'}</span>
        <span className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
          <span className="block truncate text-sm font-semibold text-white">{session.nombre}</span>
          <span className="block text-xs text-slate-400">{ROLES[session.rol]}</span>
        </span>
        <ChevronUp className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''} ${collapsed ? 'lg:hidden' : ''}`} />
      </button>
    </div>
  )
}
