import { useEffect } from 'react'
import { useApp } from '../../../store'
import Directorio from '../../simpatizantes/pages/DirectorioPage'

export default function GestoresAdmin() {
  const { cargarSimpatizantesApi, cargarLideresApi } = useApp()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void cargarSimpatizantesApi(); void cargarLideresApi() }, [])
  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Gestor</h1>
        <p className="mb-1 text-sm text-gray-500">Gestiona quién tiene el rol de Gestor. Un gestor no digita fichas nuevas: mejora la caracterización de los simpatizantes de los líderes que tiene a cargo (perfil, ocupación, intereses, puesto/mesa de votación) para apoyar la toma de decisiones de la campaña. No puede eliminar registros ni editar datos básicos de identidad.</p>
        <Directorio rolMode="gestor" />
      </div>
    </main>
  )
}
