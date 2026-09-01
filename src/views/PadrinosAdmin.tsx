import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { LIDERES_INFO } from '../data'
import { Badge, Card } from '../components/ui'
import CambiarPass from '../components/CambiarPass'

const selCls = 'border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-500'
const inputCls2 = 'border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500'

export default function PadrinosAdmin() {
  const { db, asignarPadrino, quitarRolPadrino, promoverPadrino, nuevoPadrino } = useApp()

  const [seleccion, setSeleccion] = useState<Record<string, string>>(() => ({ ...db.padrinoLider }))
  const [staffNombre, setStaffNombre] = useState('')
  const [staffCedula, setStaffCedula] = useState('')
  const [staffSector, setStaffSector] = useState('')
  const [q, setQ] = useState('')
  const [passTarget, setPassTarget] = useState<{ userId: string; nombre: string } | null>(null)

  const activos = db.padrinos.filter((p) => p.activo)
  const candidatos = useMemo(
    () => db.personas.filter((p) => !p.esLider && !p.esPadrino && !activos.some((a) => a.personaId === p.id)),
    [db, activos],
  )
  const resultados = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    return candidatos.filter((p) => `${p.nombres} ${p.apellidos} ${p.cedula}`.toLowerCase().includes(s)).slice(0, 12)
  }, [candidatos, q])

  const guardar = (lid: string) => asignarPadrino(lid, seleccion[lid] ?? '')

  const agregarStaff = () => {
    if (!staffNombre.trim()) return
    nuevoPadrino(staffNombre.trim(), staffCedula.trim(), staffSector.trim())
    setStaffNombre('')
    setStaffCedula('')
    setStaffSector('')
  }

  return (
    <div>
      <Card title="🛡️ Padrinos de la mesa de datos">
        <p className="text-xs text-slate-500 mb-3">
          Un padrino es personal de campaña: no necesita votar en Valledupar. Puede ser también simpatizante o solo staff.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-slate-50">
              <tr>
                {['Padrino', 'Sector', 'Es simpatizante', 'Líderes apadrinados', ''].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activos.map((p) => {
                const lideres = LIDERES_INFO.filter((l) => db.padrinoLider[l.id] === p.id)
                return (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="px-3 py-2.5">
                      <div className="text-sm font-semibold text-slate-800">{p.nombre}</div>
                      {p.userId && <div className="font-mono text-[10px] text-slate-400">{p.userId}@campana.com · padrino123</div>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{p.sector || '—'}</td>
                    <td className="px-3 py-2.5">
                      {p.personaId ? (
                        <Badge className="bg-emerald-100 text-emerald-700">Sí</Badge>
                      ) : (
                        <Badge className="bg-slate-200 text-slate-600">Solo staff</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {lideres.length === 0 ? (
                          <span className="text-xs text-slate-400">Sin líderes</span>
                        ) : (
                          lideres.map((l) => (
                            <Badge key={l.id} className="bg-indigo-100 text-indigo-700">{l.nombres}</Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setPassTarget({ userId: p.userId ?? '', nombre: p.nombre })} className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap">
                          Clave
                        </button>
                        <button onClick={() => quitarRolPadrino(p.id)} className="text-xs font-semibold text-red-600 hover:underline whitespace-nowrap">
                          Quitar rol
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="➕ Nuevo padrino (solo staff)" className="mt-4">
        <p className="text-xs text-slate-500 mb-2">
          Para alguien que NO es simpatizante (no vota en Valledupar) pero será operador de datos. No queda ligado a ninguna ficha.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input value={staffNombre} onChange={(e) => setStaffNombre(e.target.value)} placeholder="Nombre completo" className={inputCls2} />
          <input value={staffCedula} onChange={(e) => setStaffCedula(e.target.value)} placeholder="Cédula (opcional)" className={inputCls2} />
          <input value={staffSector} onChange={(e) => setStaffSector(e.target.value)} placeholder="Sector / zona" className={inputCls2} />
        </div>
        <button
          onClick={agregarStaff}
          disabled={!staffNombre.trim()}
          className="mt-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700"
        >
          Agregar al staff
        </button>
      </Card>

      <Card title="🔀 Asignación de líderes" className="mt-4">
        <p className="text-xs text-slate-500 mb-3">Elige el padrino de cada líder y pulsa «Guardar» para confirmar.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="bg-slate-50">
              <tr>
                {['Líder', 'Territorio', 'Padrino asignado', ''].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LIDERES_INFO.map((l) => {
                const actual = db.padrinoLider[l.id] ?? ''
                const cambiado = (seleccion[l.id] ?? '') !== actual
                return (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="px-3 py-2.5 text-sm font-medium">{l.nombres} {l.apellidos}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[220px] truncate" title={l.territorio}>{l.territorio}</td>
                    <td className="px-3 py-2.5">
                      <select
                        value={seleccion[l.id] ?? ''}
                        onChange={(e) => setSeleccion((s) => ({ ...s, [l.id]: e.target.value }))}
                        className={selCls}
                      >
                        <option value="">Sin padrino</option>
                        {activos.map((p) => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => guardar(l.id)}
                        disabled={!cambiado}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 whitespace-nowrap"
                      >
                        Guardar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="🔍 Promover simpatizante a padrino" className="mt-4">
        <p className="text-xs text-slate-500 mb-2">
          Busca un simpatizante (que no sea líder) y pulsa «Promover» para convertirlo en padrino.
        </p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o cédula..." className={`${inputCls2} w-full max-w-md`} />
        {q.trim().length >= 2 && (
          resultados.length === 0 ? (
            <p className="text-xs text-slate-400 mt-2">Sin coincidencias.</p>
          ) : (
            <ul className="mt-2 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {resultados.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-slate-700">
                    {p.nombres} {p.apellidos} <span className="font-mono text-xs text-slate-400">{p.cedula}</span>
                  </span>
                  <button
                    onClick={() => {
                      promoverPadrino(p.id)
                      setQ('')
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap"
                  >
                    Promover →
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </Card>
      <CambiarPass open={!!passTarget} userId={passTarget?.userId ?? ''} nombre={passTarget?.nombre ?? ''} onClose={() => setPassTarget(null)} />
    </div>
  )
}
