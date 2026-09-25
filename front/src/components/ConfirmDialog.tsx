import { AlertTriangle, KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'

export interface ConfirmOptions {
  titulo: string
  mensaje: string
  confirmar?: string
  cancelar?: string
  tono?: 'peligro' | 'normal'
  icono?: 'alerta' | 'clave'
}

type Pendiente = ConfirmOptions & { resolver: (ok: boolean) => void }
let mostrar: ((p: Pendiente) => void) | null = null

// Reemplazo de window.confirm con el estilo de la app: `if (!(await confirmar({...}))) return`.
export function confirmar(opciones: ConfirmOptions): Promise<boolean> {
  return new Promise((resolver) => {
    if (!mostrar) { resolver(window.confirm(opciones.mensaje)); return }
    mostrar({ ...opciones, resolver })
  })
}

// Se monta una sola vez (App) y atiende todas las llamadas a confirmar().
export function ConfirmHost() {
  const [actual, setActual] = useState<Pendiente | null>(null)
  useEffect(() => {
    mostrar = setActual
    return () => { mostrar = null }
  }, [])
  useEffect(() => {
    if (!actual) return
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(false) }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })
  if (!actual) return null
  const cerrar = (ok: boolean) => { actual.resolver(ok); setActual(null) }
  const peligro = actual.tono === 'peligro'
  const Icono = actual.icono === 'clave' ? KeyRound : AlertTriangle
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => cerrar(false)} />
      <div role="alertdialog" aria-modal="true" className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl fade-in">
        <div className="flex gap-4">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${peligro ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}><Icono className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">{actual.titulo}</h3>
            <p className="mt-1 text-sm text-gray-500">{actual.mensaje}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => cerrar(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{actual.cancelar ?? 'Cancelar'}</button>
          <button type="button" autoFocus onClick={() => cerrar(true)} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${peligro ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{actual.confirmar ?? 'Aceptar'}</button>
        </div>
      </div>
    </div>
  )
}
