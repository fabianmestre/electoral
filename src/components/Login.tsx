import { useState } from 'react'
import { Lock, ShieldCheck, UserRound } from 'lucide-react'
import { useApp } from '../store'
import { LIDERES_INFO, USUARIOS } from '../data'
import type { Usuario } from '../types'

function labelDe(u: Usuario): string {
  if (u.rol === 'admin') return 'Director de Campaña — Administrador (acceso total)'
  const l = LIDERES_INFO.find((x) => x.id === u.liderId)
  return `${u.nombre} — Líder · ${l?.territorio ?? ''}`
}

export default function Login() {
  const { login, notify } = useApp()
  const [userId, setUserId] = useState('admin')
  const [pass, setPass] = useState('admin123')
  const [error, setError] = useState(false)

  const onSelect = (id: string) => {
    setUserId(id)
    const u = USUARIOS.find((x) => x.id === id)
    setPass(u?.pass ?? '')
    setError(false)
  }

  const submit = () => {
    const u = USUARIOS.find((x) => x.id === userId && x.pass === pass)
    if (!u) {
      setError(true)
      notify('Credenciales inválidas', 'error')
      return
    }
    setError(false)
    login(u.id)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 text-white">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Campaña al Concejo de Valledupar</h1>
          <p className="text-blue-100 mt-1 text-sm">Cesar · Colombia — CRM Electoral</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-medium text-slate-600 inline-flex items-center gap-1">
                <UserRound className="w-3.5 h-3.5" /> Usuario
              </label>
              <select
                value={userId}
                onChange={(e) => onSelect(e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {USUARIOS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {labelDe(u)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 inline-flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Contraseña
              </label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            {error && <div className="text-xs text-red-600">Credenciales inválidas.</div>}
            <button className="w-full bg-blue-600 text-white font-semibold rounded-lg py-2.5 hover:bg-blue-700 transition">
              Ingresar
            </button>
          </form>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            Accesos: <span className="font-mono">admin@campana.com / admin123</span> ·{' '}
            <span className="font-mono">lider1..6@campana.com / lider123</span>
          </div>
        </div>
      </div>
    </div>
  )
}
