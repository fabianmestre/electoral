import { useState } from 'react'
import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useApp } from '../store'
export default function Login() {
  const { login } = useApp()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const submit = async () => {
    if (loading) return
    setError('')
    setLoading(true)
    try { await login(email, pass) }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.') }
    finally { setLoading(false) }
  }

  return (
    <div className="login-screen min-h-dvh flex items-center justify-center px-5 py-10 bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 antialiased">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 text-white">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/15 mb-5">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-[26px] sm:text-[30px] font-semibold leading-tight tracking-tight text-balance">Campaña al Concejo de Valledupar</h1>
          <p className="text-blue-100/90 mt-3 text-sm tracking-wide">Cesar · Colombia — CRM Electoral</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-blue-950/25 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Bienvenido</h2>
          <p className="mt-2 mb-7 text-sm leading-relaxed text-slate-500">Ingresa con tu correo y contraseña para acceder a tu cuenta.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
            className="space-y-5"
            aria-busy={loading}
          >
            <div>
              <label htmlFor="login-email" className="text-sm font-medium text-slate-700 inline-flex items-center gap-2">
                <Mail aria-hidden="true" className="w-4 h-4 text-slate-400" /> Correo electrónico
              </label>
              <input
                type="email"
                id="login-email"
                name="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                readOnly={loading}
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="correo@campana.com"
                className="login-input w-full mt-2 border border-slate-200 bg-slate-50 rounded-xl px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="text-sm font-medium text-slate-700 inline-flex items-center gap-2">
                <Lock aria-hidden="true" className="w-4 h-4 text-slate-400" /> Contraseña
              </label>
              <div className="relative mt-2">
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                name="password"
                autoComplete="current-password"
                readOnly={loading}
                aria-invalid={!!error}
                aria-describedby={error ? 'login-error' : undefined}
                required
                value={pass}
                onChange={(e) => { setPass(e.target.value); setError('') }}
                placeholder="Ingresa tu contraseña"
                className="login-input w-full border border-slate-200 bg-slate-50 rounded-xl pl-4 pr-14 py-3.5 text-base text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                aria-controls="login-password"
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
              >
                {showPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
              </button>
              </div>
            </div>
            {error && <div id="login-error" role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm leading-relaxed text-red-700"><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
            <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait w-full bg-blue-600 text-white text-base font-semibold rounded-xl py-3.5 shadow-lg shadow-blue-600/15 hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 focus-visible:ring-offset-2 transition">
              {loading && <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" />}
              {loading ? 'Ingresando…' : 'Ingresar'}
              {!loading && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
