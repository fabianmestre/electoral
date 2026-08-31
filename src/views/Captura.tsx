import { Plus, Smartphone } from 'lucide-react'
import { useApp } from '../store'
import { firmesDe, gestionesDeLider, totalDe } from '../data'

export default function Captura() {
  const { db, session, openPersona } = useApp()
  const lid = session?.liderId ?? ''

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 mb-3">
            <Smartphone className="w-7 h-7" />
          </div>
          <h2 className="font-bold text-xl text-slate-900">Captura Rápida en Campo</h2>
          <p className="text-sm text-slate-500">
            Formulario optimizado para móvil · Anti-duplicados por cédula · Autocompletado censal
          </p>
        </div>
        <button
          onClick={() => openPersona({ mode: 'new' })}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700"
        >
          <Plus className="w-6 h-6" /> Digitar nuevo simpatizante
        </button>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xl font-extrabold text-blue-700">{totalDe(db, lid)}</div>
            <div className="text-[11px] text-slate-500">Registrados</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xl font-extrabold text-emerald-600">{firmesDe(db, lid)}</div>
            <div className="text-[11px] text-slate-500">Firmes</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xl font-extrabold text-amber-600">{gestionesDeLider(db, lid)}</div>
            <div className="text-[11px] text-slate-500">Gestiones</div>
          </div>
        </div>
      </div>
    </div>
  )
}
