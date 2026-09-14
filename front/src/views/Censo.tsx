import { Fragment, useState } from 'react'
import { useApp } from '../store'
import { MUNICIPIO_CAMPANA, PUESTOS, esValido } from '../data'
import { Card } from '../components/ui'

export default function Censo() {
  const { db, irADirectorio } = useApp()
  const [expanded, setExpanded] = useState<string | null>(null)

  const votosDePuesto = (puestoId: string) =>
    db.personas.filter((p) => p.puesto === puestoId && esValido(p)).length

  const votosDeMesa = (puestoId: string, mesa: number) =>
    db.personas.filter((p) => p.puesto === puestoId && p.mesa === mesa && esValido(p)).length

  return (
    <div>
      <Card title="🗺️ División Político-Electoral — Valledupar · puestos de votación">
        <p className="text-xs text-slate-500 mb-2">
          «Votos definidos» = simpatizantes válidos (Valledupar) asignados. Haz clic en un puesto para ver sus mesas; haz clic en una mesa para ver sus votantes en el Directorio.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50">
              <tr>
                {['Puesto', 'Zona', 'Comuna/Correg.', 'Barrio', 'Mesas', 'Votos definidos'].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PUESTOS.filter((p) => p.municipio === MUNICIPIO_CAMPANA).map((p) => {
                const nVotos = votosDePuesto(p.id)
                const abierto = expanded === p.id
                const mesas = Array.from({ length: p.mesas }, (_, i) => p.mesaBase + i)
                return (
                  <Fragment key={p.id}>
                    <tr
                      onClick={() => setExpanded(abierto ? null : p.id)}
                      className="cursor-pointer hover:bg-slate-50 border-b border-slate-100"
                    >
                      <td className="px-3 py-2.5 text-sm font-medium">
                        {abierto ? '▾' : '▸'} {p.id} · {p.nombre}
                      </td>
                      <td className="px-3 py-2.5 text-sm">{p.zona}</td>
                      <td className="px-3 py-2.5 text-sm">{p.zona === 'Urbana' ? p.comuna : p.corregimiento}</td>
                      <td className="px-3 py-2.5 text-sm">{p.barrio}</td>
                      <td className="px-3 py-2.5 text-sm whitespace-nowrap">
                        {p.mesaBase}–{p.mesaBase + p.mesas - 1}
                      </td>
                      <td className="px-3 py-2.5 text-sm font-semibold text-blue-700">{nVotos}</td>
                    </tr>
                    {abierto &&
                      mesas.map((m) => {
                        const nM = votosDeMesa(p.id, m)
                        return (
                          <tr
                            key={m}
                            onClick={() => irADirectorio({ puesto: p.id, mesa: m, validez: 'valido' })}
                            className="bg-slate-50/70 border-b border-slate-100 cursor-pointer hover:bg-blue-50"
                            title="Ver votantes válidos de esta mesa en el Directorio"
                          >
                            <td colSpan={5} className="px-3 py-2 pl-10 text-sm text-slate-600">
                              Mesa {m}
                            </td>
                            <td className="px-3 py-2 text-sm font-semibold text-blue-700">
                              {nM} votos →
                            </td>
                          </tr>
                        )
                      })}
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
