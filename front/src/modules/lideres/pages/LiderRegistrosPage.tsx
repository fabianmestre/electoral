import { useEffect } from 'react'
import { useApp } from '../../../store'
import Directorio from '../../simpatizantes/pages/DirectorioPage'

// Solo lectura: las fichas que el propio líder registró.
export default function LiderRegistrosPage() {
  const { cargarSimpatizantesApi, cargarLideresApi } = useApp()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void cargarSimpatizantesApi(); void cargarLideresApi() }, [])
  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mis Registros</h1>
        <p className="mb-6 text-sm text-gray-500">Simpatizantes que tú mismo has registrado. Vista de solo lectura — no puedes editarlos ni eliminarlos.</p>
        <Directorio soloPropios />
      </div>
    </main>
  )
}
