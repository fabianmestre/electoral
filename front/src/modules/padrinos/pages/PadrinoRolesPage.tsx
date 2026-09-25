import { useEffect } from 'react'
import { useApp } from '../../../store'
import Directorio from '../../simpatizantes/pages/DirectorioPage'

export default function PadrinoRolesPage() {
  const { cargarSimpatizantesApi, cargarLideresApi } = useApp()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void cargarSimpatizantesApi(); void cargarLideresApi() }, [])
  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Padrino</h1>
        <p className="mb-1 text-sm text-gray-500">Gestiona quién tiene el rol de Padrino. Un padrino no ingresa a la plataforma — solo agrupa a los líderes que tiene a cargo dentro de la estructura de campaña. Esta vista es un listado de solo consulta.</p>
        <Directorio rolMode="padrino" />
      </div>
    </main>
  )
}
