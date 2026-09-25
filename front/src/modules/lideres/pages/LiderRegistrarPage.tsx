import { useEffect } from 'react'
import { useApp } from '../../../store'

// Pantalla de inicio de líderes y digitadores: registrar fichas nuevas con el formulario completo.
export default function LiderRegistrarPage() {
  const { session, openPersona, navigate, cargarLideresApi } = useApp()
  // El formulario necesita los líderes: el propio (líder) o la lista para asignar (digitador).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void cargarLideresApi() }, [])
  const digitador = session?.rol === 'digitador'
  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold text-gray-900">Registrar Simpatizante</h1>
        <p className="text-sm text-gray-500">Formulario completo — puedes diligenciar todo lo que el simpatizante te comparta.</p>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {digitador ? <>
            <p className="font-semibold">Como digitador, tu único rol en la plataforma es registrar simpatizantes nuevos.</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              <li>No puedes ver los simpatizantes ya cargados en la plataforma, ni los que tú mismo registraste.</li>
              <li>Una vez guardas una ficha, no podrás editarla ni eliminarla — revisa bien los datos antes de guardar.</li>
            </ul>
          </> : <>
            <p className="font-semibold">Como líder, puedes registrar simpatizantes nuevos igual que un digitador.</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              <li>Puedes ver, en modo lectura, lo que tú mismo has registrado en <a className="cursor-pointer font-medium underline" onClick={() => navigate('lider-registros')}>Mis Registros</a> — no puedes editarlo ni eliminarlo.</li>
              <li>Esta capacidad es temporal: la campaña puede cerrártela más adelante.</li>
            </ul>
          </>}
        </div>
        <button type="button" onClick={() => openPersona({ mode: 'new' })} className="mt-6 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">+ Registrar otra ficha</button>
      </div>
    </main>
  )
}
