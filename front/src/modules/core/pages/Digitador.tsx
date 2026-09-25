import { useEffect } from 'react'
import { useApp } from '../../../store'
import LiderRegistrarPage from '../../lideres/pages/LiderRegistrarPage'
import Directorio from '../../simpatizantes/pages/DirectorioPage'

// Esta vista es a la vez la gestión del rol (admin) y la pantalla de trabajo del
// usuario digitador (registrar simpatizantes).
export default function Digitador() {
  const { session, cargarSimpatizantesApi, cargarLideresApi } = useApp()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void cargarSimpatizantesApi(); void cargarLideresApi() }, [])

  if (session?.rol !== 'admin') return <LiderRegistrarPage />

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Digitador</h1>
        <p className="mb-1 text-sm text-gray-500">Gestiona quién tiene el rol de Digitador. Un digitador solo puede registrar fichas nuevas: no ve los datos de la plataforma y no puede editar ni eliminar una vez guardadas.</p>
        <Directorio rolMode="digitador" />
      </div>
    </main>
  )
}
