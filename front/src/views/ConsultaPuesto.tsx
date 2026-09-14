import { useState } from 'react'
import { Copy, ExternalLink, MapPin } from 'lucide-react'
import { Card, inputCls } from '../components/ui'

const CONSULTA_URL = 'https://consultacenso.registraduria.gov.co/'
const buttonCls = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50'

export default function ConsultaPuesto() {
  const [cedula, setCedula] = useState('')
  const [mensaje, setMensaje] = useState('')

  async function copiarCedula() {
    try {
      await navigator.clipboard.writeText(cedula)
      setMensaje('Cédula copiada. Pégala en el formulario oficial.')
    } catch {
      setMensaje('No se pudo copiar. Selecciona la cédula y cópiala manualmente.')
    }
  }

  return (
    <div className="space-y-4">
      <Card title={<span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Consulta puesto</span>}>
        <p className="text-sm text-slate-600 mb-4">
          Consulta tu puesto, dirección y mesa de votación en la Registraduría Nacional.
          Ingresa la cédula en el formulario oficial, selecciona la elección y completa el CAPTCHA si aparece.
        </p>
        <div className="max-w-md mb-4">
          <label htmlFor="consulta-cedula" className="text-sm font-medium text-slate-700">Cédula para copiar</label>
          <input
            id="consulta-cedula"
            className={inputCls}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={15}
            placeholder="Número sin puntos ni comas"
            value={cedula}
            onChange={(event) => {
              setCedula(event.target.value.replace(/\D/g, ''))
              setMensaje('')
            }}
            aria-describedby="consulta-cedula-ayuda"
          />
          <p id="consulta-cedula-ayuda" className="text-xs text-slate-500 mt-2">
            Este campo solo facilita copiar el número; no lo guarda ni lo envía automáticamente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`${buttonCls} bg-slate-100 text-slate-700 hover:bg-slate-200`} disabled={!cedula} onClick={copiarCedula}>
            <Copy className="h-4 w-4" /> Copiar cédula
          </button>
          <a href={CONSULTA_URL} target="_blank" rel="noopener noreferrer" className={`${buttonCls} bg-blue-600 text-white hover:bg-blue-700`}>
            <ExternalLink className="h-4 w-4" /> Abrir formulario oficial
          </a>
        </div>
        <p role="status" className="text-sm text-slate-600 mt-3">{mensaje}</p>
        <p className="text-xs text-slate-400 mt-2">
          La Registraduría bloquea que su página se muestre dentro de otras aplicaciones (protección contra clickjacking),
          por eso la consulta siempre se abre en una pestaña nueva.
        </p>
      </Card>
    </div>
  )
}
