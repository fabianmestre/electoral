import { Fragment, useMemo, useState } from 'react'
import { useApp } from '../../../store'
import { DEPARTAMENTO_CAMPANA, MUNICIPIO_CAMPANA, PUESTOS } from '../../../data'
import { Card } from '../../../components/ui'
import type { SimpatizanteApi } from '../../../types'

const esValidoApi = (p: SimpatizanteApi) => p.departamento === DEPARTAMENTO_CAMPANA && p.municipio === MUNICIPIO_CAMPANA
// Los puestos cargados en BD pueden venir como "pv-06"; el catálogo usa "PV06".
const normPuesto = (id: string) => id.toUpperCase().replace(/[^A-Z0-9]/g, '')

interface FilaPuesto {
  clave: string
  puesto: string // valor tal como está en BD, para filtrar el Directorio
  nombre: string
  zona: string
  sector: string
  barrio: string
  votos: number
  votaron: number
  mesas: { mesa: number; votos: number; votaron: number }[]
}

export default function Censo() {
  const { simpatizantesApi, cargandoSimpatizantes, irADirectorio } = useApp()
  const [expanded, setExpanded] = useState<string | null>(null)

  // «Votos definidos» = simpatizantes válidos (Valledupar) con puesto asignado, agrupados
  // por puesto y mesa según lo registrado en cada ficha.
  const filas = useMemo(() => {
    const porPuesto = new globalThis.Map<string, FilaPuesto>()
    for (const p of simpatizantesApi) {
      if (!p.puesto || !esValidoApi(p)) continue
      const clave = normPuesto(p.puesto)
      let fila = porPuesto.get(clave)
      if (!fila) {
        const cat = PUESTOS.find((x) => normPuesto(x.id) === clave)
        fila = {
          clave, puesto: p.puesto, nombre: cat?.nombre ?? p.puesto, zona: cat?.zona ?? '—',
          sector: (cat?.zona === 'Rural' ? cat?.corregimiento : cat?.comuna) ?? '—', barrio: cat?.barrio ?? '—',
          votos: 0, votaron: 0, mesas: [],
        }
        porPuesto.set(clave, fila)
      }
      fila.votos++
      if (p.votoRegistrado) fila.votaron++
      if (p.mesa) {
        let m = fila.mesas.find((x) => x.mesa === p.mesa)
        if (!m) { m = { mesa: p.mesa, votos: 0, votaron: 0 }; fila.mesas.push(m) }
        m.votos++
        if (p.votoRegistrado) m.votaron++
      }
    }
    return [...porPuesto.values()]
      .map((f) => ({ ...f, mesas: f.mesas.sort((a, b) => a.mesa - b.mesa) }))
      .sort((a, b) => b.votos - a.votos)
  }, [simpatizantesApi])

  return (
    <div>
      <Card title={`🗺️ División Político-Electoral — ${MUNICIPIO_CAMPANA} · puestos de votación`}>
        <p className="text-xs text-slate-500 mb-2">
          «Votos definidos» = simpatizantes válidos ({MUNICIPIO_CAMPANA}) asignados. Haz clic en un puesto para ver sus mesas; haz clic en una mesa para ver sus votantes en el Directorio.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50">
              <tr>
                {['Puesto', 'Zona', 'Comuna/Correg.', 'Barrio', 'Mesas', 'Votos definidos', 'Ya votaron'].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">{cargandoSimpatizantes ? 'Cargando…' : 'Aún no hay simpatizantes válidos con puesto de votación asignado.'}</td></tr>
              )}
              {filas.map((p) => {
                const abierto = expanded === p.clave
                return (
                  <Fragment key={p.clave}>
                    <tr onClick={() => setExpanded(abierto ? null : p.clave)} className="cursor-pointer hover:bg-slate-50 border-b border-slate-100">
                      <td className="px-3 py-2.5 text-sm font-medium">{abierto ? '▾' : '▸'} {p.nombre}</td>
                      <td className="px-3 py-2.5 text-sm">{p.zona}</td>
                      <td className="px-3 py-2.5 text-sm">{p.sector}</td>
                      <td className="px-3 py-2.5 text-sm">{p.barrio}</td>
                      <td className="px-3 py-2.5 text-sm whitespace-nowrap">{p.mesas.length ? p.mesas.map((m) => m.mesa).join(', ') : '—'}</td>
                      <td className="px-3 py-2.5 text-sm font-semibold text-blue-700">{p.votos}</td>
                      <td className="px-3 py-2.5 text-sm font-semibold text-emerald-700">{p.votaron}</td>
                    </tr>
                    {abierto && p.mesas.map((m) => (
                      <tr
                        key={m.mesa}
                        onClick={() => irADirectorio({ puesto: p.puesto, mesa: m.mesa, validez: 'valido' })}
                        className="bg-slate-50/70 border-b border-slate-100 cursor-pointer hover:bg-blue-50"
                        title="Ver votantes válidos de esta mesa en el Directorio"
                      >
                        <td colSpan={5} className="px-3 py-2 pl-10 text-sm text-slate-600">Mesa {m.mesa}</td>
                        <td className="px-3 py-2 text-sm font-semibold text-blue-700">{m.votos} votos →</td>
                        <td className="px-3 py-2 text-sm text-emerald-700">{m.votaron}</td>
                      </tr>
                    ))}
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
