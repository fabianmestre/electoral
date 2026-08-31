import type { Persona } from '../types'
import { edad, fmtFecha } from '../lib'
import { Badge } from './ui'

export default function Cumpleanos({ items }: { items: { p: Persona; dias: number }[] }) {
  if (items.length === 0) return <p className="text-sm text-slate-500">No hay cumpleaños próximos.</p>
  return (
    <div className="space-y-2">
      {items.map(({ p, dias }) => (
        <div key={p.id} className="flex items-center gap-3 bg-slate-50 rounded-lg p-2">
          <div
            className={`w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-bold ${
              dias === 0 ? 'bg-pink-500' : 'bg-slate-300'
            }`}
          >
            {p.nombres[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {p.nombres} {p.apellidos}
            </div>
            <div className="text-[11px] text-slate-500">
              Cumple el {fmtFecha(p.fechaNacimiento).split(',')[0]} · {edad(p.fechaNacimiento)} años
            </div>
          </div>
          <div className="text-right">
            <Badge className={dias === 0 ? 'bg-pink-100 text-pink-700' : 'bg-slate-200 text-slate-600'}>
              {dias === 0 ? '🎉 Hoy' : dias === 1 ? 'Mañana' : `en ${dias} días`}
            </Badge>
            <div className="text-[10px] text-slate-400 mt-1">📱 {p.telefono}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
