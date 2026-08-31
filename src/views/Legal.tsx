import { ShieldCheck, ShieldAlert, Wallet, BadgePercent } from 'lucide-react'
import { useApp } from '../store'
import { fmtCOP, fmtFechaHora } from '../lib'
import { Badge, Card, Kpi } from '../components/ui'

export default function Legal() {
  const { db } = useApp()
  const total = db.personas.length
  const aut = db.personas.filter((p) => p.habeasData).length
  const pend = total - aut
  const inv = db.gestiones.reduce((s, g) => s + (Number(g.monto) || 0), 0)
  const logs = db.logsHabeas.slice().reverse().slice(0, 40)

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi icon={ShieldCheck} label="Autorizados" value={aut} accent="text-emerald-600" />
        <Kpi icon={ShieldAlert} label="Pendientes" value={pend} accent="text-red-600" />
        <Kpi icon={BadgePercent} label="% cumplimiento" value={`${Math.round((aut / total) * 100)}%`} accent="text-blue-600" />
        <Kpi icon={Wallet} label="Total gestionado" value={fmtCOP(inv)} accent="text-amber-600" />
      </div>

      <Card title="📜 Log de Habeas Data (Ley 1581 de 2012) — auditoría">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-50">
              <tr>
                {['Fecha', 'Cédula', 'Persona', 'Acción', 'Estado', 'Usuario'].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={i} className="hover:bg-slate-50 border-b border-slate-100">
                  <td className="px-3 py-2.5 text-sm">{fmtFechaHora(l.fecha)}</td>
                  <td className="px-3 py-2.5 font-mono text-sm">{l.cedula}</td>
                  <td className="px-3 py-2.5 text-sm">{l.nombre}</td>
                  <td className="px-3 py-2.5 text-sm">{l.accion}</td>
                  <td className="px-3 py-2.5">
                    <Badge className={l.estado === 'Autorizado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                      {l.estado}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-sm">{l.usuario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
