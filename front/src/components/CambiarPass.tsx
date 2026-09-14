import { useState } from 'react'
import { useApp } from '../store'
import { Modal, inputCls } from './ui'

export default function CambiarPass({
  open,
  userId,
  nombre,
  onClose,
}: {
  open: boolean
  userId: string
  nombre: string
  onClose: () => void
}) {
  const { cambiarPassword } = useApp()
  const [pass, setPass] = useState('')

  const guardar = () => {
    if (pass.trim().length < 4) return
    cambiarPassword(userId, pass.trim())
    setPass('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cambiar contraseña"
      subtitle={nombre}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={pass.trim().length < 4}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700"
          >
            Guardar
          </button>
        </>
      }
    >
      <input
        type="text"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        placeholder="Nueva contraseña (mín. 4 caracteres)"
        className={inputCls}
        autoFocus
      />
    </Modal>
  )
}
