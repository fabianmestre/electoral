import { useEffect } from 'react'
import { Card } from '../../../components/ui'
import { useApp } from '../../../store'
import CapturaPlanillaModal from '../../../components/CapturaPlanillaModal'
import Directorio from '../../simpatizantes/pages/DirectorioPage'

// Esta vista es a la vez la gestión del rol (admin) y la pantalla de trabajo de los
// usuarios digitador y líder (captura de planillas).
export default function Digitador() {
  const { session, cargarSimpatizantesApi, cargarLideresApi, lideresApi, usuariosApi, notify } = useApp()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void cargarSimpatizantesApi(); void cargarLideresApi() }, [])

  if (session?.rol !== 'admin') {
    const liderPropio = session?.rol === 'lider' ? lideresApi.find((item) => item.userId === session.id) : undefined
    return <Card title="Captura de planilla">
      <p className="mb-4 text-sm text-slate-500">Completa una fila y pulsa Guardar y continuar. El formulario quedará listo para la siguiente persona.</p>
      {session?.rol === 'lider' && !liderPropio && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Cargando la asociación de tu cuenta de líder…</p>}
      <CapturaPlanillaModal
        open
        embedded
        capturaLider={session?.rol === 'lider'}
        defaultLiderId={liderPropio?.id}
        lideres={lideresApi}
        usuarios={usuariosApi}
        onClose={() => undefined}
        onSaved={cargarSimpatizantesApi}
        notify={notify}
      />
    </Card>
  }

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
