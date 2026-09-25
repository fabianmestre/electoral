import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useApp } from '../../../store'
import { DEPARTAMENTO_CAMPANA, MUNICIPIO_CAMPANA } from '../../../data'
import { fmtCOP } from '../../../lib'
import type { LiderApi, SimpatizanteApi } from '../../../types'
import { Badge, Card, Donut, GroupedBars, Legend, ProgressBar } from '../../../components/ui'

const PALETA = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#f43f5e', '#14b8a6']

const esValidoApi = (p: SimpatizanteApi) => p.departamento === DEPARTAMENTO_CAMPANA && p.municipio === MUNICIPIO_CAMPANA

export default function Lideres() {
  const {
    simpatizantesApi, lideresApi, gestionesApi, cargarSimpatizantesApi, cargarLideresApi, cargarGestionesApi,
    setLiderFilter, navigate, irADirectorio,
  } = useApp()

  useEffect(() => {
    void cargarSimpatizantesApi()
    void cargarLideresApi()
    void cargarGestionesApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalDe = (lid: string) => simpatizantesApi.filter((p) => p.liderId === lid).length
  const firmesDe = (lid: string) => simpatizantesApi.filter((p) => p.liderId === lid && p.nivelVoto === 'Firme').length
  const firmesValidosDe = (lid: string) => simpatizantesApi.filter((p) => p.liderId === lid && p.nivelVoto === 'Firme' && esValidoApi(p)).length
  const invalidosDe = (lid: string) => simpatizantesApi.filter((p) => p.liderId === lid && !esValidoApi(p)).length
  const gestionesDeLider = (lid: string) => gestionesApi.filter((g) => g.simpatizante?.liderId === lid).length
  const invertidoLider = (lid: string) =>
    gestionesApi.filter((g) => g.simpatizante?.liderId === lid).reduce((s, g) => s + (Number(g.monto) || 0), 0)

  const lideres: LiderApi[] = lideresApi
  const groups = lideres.map((l) => l.nombres)
  const donaBase = lideres.map((l, i) => ({
    label: `${l.nombres} ${l.apellidos.split(' ')[0]}`,
    value: totalDe(l.id),
    color: PALETA[i % PALETA.length],
  }))

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Monitoreo de <b>meta vs votos firmes válidos</b> (solo electores de Valledupar cuentan). Los registros fuera del
        municipio o del departamento se marcan como <b>error del líder</b>.{' '}
        <span className="text-slate-400">Haz clic en los números para ver a las personas en el Directorio.</span>
      </p>

      {lideres.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
          Sin líderes registrados todavía. Créalos en el módulo Líderes.
        </div>
      ) : (
        <>
          {/* Gráficas de comportamiento */}
          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <Card title="Base por líder (cantidad)">
              <div className="flex items-center gap-4">
                <div className="w-40 h-40 shrink-0">
                  <Donut data={donaBase} />
                </div>
                <div className="flex-1">
                  <Legend data={donaBase} />
                </div>
              </div>
            </Card>
            <Card title="Firmes válidos vs Inválidos (calidad del trabajo)">
              <GroupedBars
                groups={groups}
                series={[
                  { label: 'Firmes válidos', color: '#10b981', values: lideres.map((l) => firmesValidosDe(l.id)) },
                  { label: 'Inválidos', color: '#ef4444', values: lideres.map((l) => invalidosDe(l.id)) },
                ]}
              />
            </Card>
          </div>

          <div className="mb-4">
            <Card title="Meta vs Firmes válidos (avance)">
              <GroupedBars
                groups={groups}
                series={[
                  { label: 'Meta', color: '#cbd5e1', values: lideres.map((l) => l.meta) },
                  { label: 'Firmes válidos', color: '#6366f1', values: lideres.map((l) => firmesValidosDe(l.id)) },
                ]}
              />
            </Card>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    {['Líder', 'Meta', 'Registrados', 'Firmes', 'Firmes válidos', 'Inválidos', 'Gestiones', 'Avance', 'Invertido', 'Acciones'].map((h) => (
                      <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lideres.map((l) => {
                    const total = totalDe(l.id)
                    const firmes = firmesDe(l.id)
                    const firmesV = firmesValidosDe(l.id)
                    const invalidos = invalidosDe(l.id)
                    const ges = gestionesDeLider(l.id)
                    const pct = l.meta > 0 ? Math.min(100, Math.round((firmesV / l.meta) * 100)) : 0
                    return (
                      <tr key={l.id} className="hover:bg-slate-50 border-b border-slate-100">
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-slate-900">{l.nombres} {l.apellidos}</div>
                          <div className="text-[11px] text-slate-500">{l.territorio || '—'}</div>
                          <Badge className={l.activo ? 'bg-blue-100 text-blue-700 mt-1' : 'bg-slate-200 text-slate-600 mt-1'}>
                            {l.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-sm font-semibold">{l.meta}</td>
                        <td className="px-3 py-2.5 text-sm">
                          <button onClick={() => irADirectorio({ liderId: l.id })} className="text-blue-600 hover:underline" title="Ver en el directorio">
                            {total}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-sm">
                          <button onClick={() => irADirectorio({ liderId: l.id, nivelVoto: 'Firme' })} className="text-blue-600 hover:underline" title="Ver firmes en el directorio">
                            {firmes}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-sm font-semibold">
                          <button onClick={() => irADirectorio({ liderId: l.id, nivelVoto: 'Firme', validez: 'valido' })} className="text-emerald-700 hover:underline" title="Ver firmes válidos en el directorio">
                            {firmesV}
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          {invalidos === 0 ? (
                            <span className="text-slate-400 text-sm">0</span>
                          ) : (
                            <button onClick={() => irADirectorio({ liderId: l.id, validez: 'invalido' })} className="text-red-600 hover:underline font-semibold inline-flex items-center gap-1" title="Ver inválidos en el directorio">
                              <AlertTriangle className="w-3.5 h-3.5" /> {invalidos}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-sm">{ges}</td>
                        <td className="px-3 py-2.5 min-w-[140px]">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">{firmesV} / {l.meta}</span>
                            <span className="font-semibold">{pct}%</span>
                          </div>
                          <ProgressBar pct={pct} color={pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'} />
                        </td>
                        <td className="px-3 py-2.5 text-sm text-amber-700">{fmtCOP(invertidoLider(l.id))}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setLiderFilter(l.id)
                              navigate('directorio')
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Simpatizantes
                          </button>
                          <button
                            onClick={() => {
                              setLiderFilter(l.id)
                              navigate('gestiones')
                            }}
                            className="text-xs text-blue-600 hover:underline ml-2"
                          >
                            Gestiones
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
