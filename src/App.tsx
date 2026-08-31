import { useApp } from './store'
import Login from './components/Login'
import Layout from './components/Layout'
import PersonaForm from './components/PersonaForm'
import GestionForm from './components/GestionForm'
import { ToastView } from './components/ui'

export default function App() {
  const { session } = useApp()
  return (
    <>
      {!session ? <Login /> : <Layout />}
      <PersonaForm />
      <GestionForm />
      <ToastView />
    </>
  )
}
