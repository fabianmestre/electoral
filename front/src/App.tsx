import { useApp } from './store'
import Login from './components/Login'
import Layout from './components/Layout'
import PersonaForm from './components/PersonaForm'
import GestionForm from './components/GestionForm'
import { ToastView } from './components/ui'
import LoadingView from './views/LoadingView'
import ErrorView from './views/ErrorView'

export default function App() {
  const { session, authLoading, authError, retryAuth } = useApp()
  if (authLoading || authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center space-y-4" role="status">
          <p className="text-slate-700">{authLoading ? 'Recuperando tu sesión…' : authError}</p>
          {authError && <button type="button" onClick={retryAuth} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Reintentar</button>}
        </div>
      </div>
    )
  }
  return (
    <>
      {!session ? <Login /> : <Layout />}
      <PersonaForm />
      <GestionForm />
      <ToastView />
    </>
  )
}
