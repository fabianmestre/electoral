import { Fragment, useState } from 'react'
import { useApp } from '../store'
import { nombreLider } from '../data'
import { Badge, Card } from '../components/ui'
import type { EstadoPlanilla } from '../types'

const ESTADO_TONE: Record<EstadoPlanilla, string> = {
  entregada: 'bg-slate-200 text-slate-700',
  cargada: 'bg-blue-100 text-blue-700',
  completa: 'bg-amber-100 text-amber-700',
  auditada: 'bg-emerald-100 text-emerald-700',
}

export default function PadrinoPlanillas() {
  const { db, session } = useApp()
  const [expanded, setExpanded] = useState<string | null>(null)
  const pid = session?.padrinoId ?? ''
  const planillas = db.planillas.filter((pl) => pl.padrinoId === pid)

  return (
    <div>
      <Card title="🗂️ Planillas físicas (auditoría Ley 1581)">
        <p className="text-xs text-slate-500 mb-3">
          Cada planilla tiene un código único. Haz clic en una fila para ver qué simpatizantes firmaron esa planilla.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-slate-50">
              <tr>
                {['Código', 'Líder', 'Estado', 'Registros', 'Entrega', 'Digitación', 'Fichas en sistema'].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planillas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-slate-400 text-sm text-center">Sin planillas asignadas.</td>
                </tr>
              )}
              {planillas.map((pl) => {
                const firmantes = db.personas.filter((p) => p.planillaCodigo === pl.codigo)
                const abierto = expanded === pl.id
                return (
                  <Fragment key={pl.id}>
                    <tr
                      onClick={() => setExpanded(abierto ? null : pl.id)}
                      className="cursor-pointer hover:bg-slate-50 border-b border-slate-100"
                    >
                      <td className="px-3 py-2.5 font-mono text-sm font-semibold text-blue-700">
                        {abierto ? '▾' : '▸'} {pl.codigo}
                      </td>
                      <td className="px-3 py-2.5 text-sm">{nombreLider(pl.liderId)}</td>
                      <td className="px-3 py-2.5">
                        <Badge className={ESTADO_TONE[pl.estado]}>{pl.estado}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-sm">{pl.registros}</td>
                      <td className="px-3 py-2.5 text-sm">{pl.fechaEntrega}</td>
                      <td className="px-3 py-2.5 text-sm">{pl.fechaDigitacion || '—'}</td>
                      <td className="px-3 py-2.5 text-sm font-semibold">{firmantes.length}</td>
                    </tr>
                    {abierto && (
                      <tr className="bg-slate-50/70 border-b border-slate-100">
                        <td colSpan={7} className="px-3 py-2.5">
                          <div className="text-xs font-semibold text-slate-600 mb-1.5">
                            Simpatizantes que firmaron {pl.codigo} ({firmantes.length}):
                          </div>
                          {firmantes.length === 0 ? (
                            <p className="text-xs text-slate-400">Aún sin fichas cargadas en el sistema.</p>
                          ) : (
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-52 overflow-y-auto">
                              {firmantes.map((p) => (
                                <li key={p.id} className="text-xs text-slate-600 font-mono">
                                  {p.cedula} · {p.nombres} {p.apellidos.split(' ')[0]}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
