import { useApp } from '../../../store'
import Directorio from '../../simpatizantes/pages/DirectorioPage'

export default function LiderDirectorioPage() {
  const { navigate } = useApp()
  return <main className="flex-1 overflow-y-auto p-6"><div className="mx-auto max-w-[1400px]"><div className="mb-6"><h1 className="text-xl font-semibold text-gray-900">Líder</h1><p className="text-sm text-gray-500">Dashboard y directorio — promueve o quita el rol desde la tabla</p><div className="mt-4 flex gap-6 border-b border-gray-200"><button type="button" onClick={() => navigate('lideres')} className="border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-gray-500 hover:text-gray-700">Dashboard</button><button type="button" className="border-b-2 border-blue-600 px-1 pb-3 text-sm font-medium text-blue-600">Directorio</button></div></div><Directorio leaderMode /></div></main>
}
