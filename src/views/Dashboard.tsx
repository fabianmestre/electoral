import { useMemo, useState } from 'react'
import { BadgeCheck, Cake, Car, CheckCircle2, Clock, Send, Users, Wallet } from 'lucide-react'
import { useApp } from '../store'
import { BARRIOS, COMUNAS, CORREGIMIENTOS, LIDERES_INFO, NIVELES_ACADEMICOS, PUESTOS, camposFaltantes, cumpleanerosSemana, esValido, lideresDePadrino, validezDe } from '../data'
import { fmtCOP, fmtFechaHora } from '../lib'
import { Badge, Bars, BarsScroll, Card, Donut, Kpi, Legend, Modal, ProgressBar } from '../components/ui'
import Cumpleanos from '../components/Cumpleanos'

const VAL_COLORS: Record<string, string> = { valido: '#10b981', fuera_municipio: '#f59e0b', fuera_departamento: '#ef4444' }
const CAT_COLORS: Record<string, string> = {
  Salud: '#6366f1',
  Empleo: '#10b981',
  'Ayudas/Mercados': '#f59e0b',
  'Recursos/Dinero': '#ef4444',
  'Trámites/Asesoría': '#0ea5e9',
  'Obras comunitarias': '#8b5cf6',
}
const VEH_COLORS: Record<string, string> = { Moto: '#14b8a6', Automóvil: '#6366f1', Camioneta: '#0ea5e9', Bus: '#8b5cf6' }
const NIVEL_COLORS: Record<string, string> = {
  'Sin estudios': '#94a3b8',
  Primaria: '#f59e0b',
  Bachiller: '#64748b',
  Técnico: '#14b8a6',
  Tecnólogo: '#0ea5e9',
  Profesional: '#6366f1',
}
const CANAL_COLORS: Record<string, string> = { 'WhatsApp API': '#25D366', SMS: '#0ea5e9', Email: '#f59e0b', Llamada: '#8b5cf6' }

export default function Dashboard() {
  const { db, irAComunicaciones, irADirectorio, irAGestiones, navigate } = useApp()
  const [showCumples, setShowCumples] = useState(false)
  const [dim, setDim] = useState<'zona' | 'lider' | 'barrio' | 'puesto' | 'vehiculo'>('zona')

  const data = useMemo(() => {
    const val: Record<string, number> = { valido: 0, fuera_municipio: 0, fuera_departamento: 0 }
    db.personas.forEach((p) => val[validezDe(p)]++)
    const porMunicipio: Record<string, number> = {}
    db.personas.forEach((p) => (porMunicipio[p.municipio] = (porMunicipio[p.municipio] || 0) + 1))
    const cat: Record<string, number> = {}
    db.gestiones.forEach((g) => (cat[g.categoria] = (cat[g.categoria] || 0) + 1))
    const veh: Record<string, number> = { Moto: 0, Automóvil: 0, Camioneta: 0, Bus: 0 }
    db.personas.flatMap((p) => p.vehiculos).filter((v) => v.aDisposicion).forEach((v) => {
      if (v.tipo in veh) veh[v.tipo]++
    })
    const nivel: Record<string, number> = {}
    db.personas.forEach((p) => (nivel[p.nivelAcademico] = (nivel[p.nivelAcademico] || 0) + 1))
    return { val, porMunicipio, cat, veh, nivel }
  }, [db])

  const total = db.personas.length
  const validos = db.personas.filter(esValido).length
  const firmesValidos = db.personas.filter((p) => p.nivelVoto === 'Firme' && esValido(p)).length
  const gestionesPendientes = db.gestiones.filter((g) => g.estado === 'Pendiente' || g.estado === 'En Proceso').length
  const invertido = db.gestiones.reduce((s, g) => s + (Number(g.monto) || 0), 0)
  const cumples = cumpleanerosSemana(db)

  const donaVal = Object.keys(VAL_COLORS).map((k) => ({
    label: k === 'valido' ? 'Válidos (Valledupar)' : k === 'fuera_municipio' ? 'Otro municipio' : 'Otro departamento',
    value: data.val[k],
    color: VAL_COLORS[k],
  }))
  const donaNivel = NIVELES_ACADEMICOS.map((n) => ({ label: n, value: data.nivel[n] || 0, color: NIVEL_COLORS[n] }))
  const barrasMun = Object.entries(data.porMunicipio)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([m, n]) => ({ label: m, value: n, color: m === 'Valledupar' ? '#10b981' : '#f59e0b' }))
  const donaCat = Object.keys(CAT_COLORS).map((k) => ({ label: k, value: data.cat[k] || 0, color: CAT_COLORS[k] }))
  const barrasVeh = Object.keys(VEH_COLORS).map((k) => ({ label: k, value: data.veh[k], color: VEH_COLORS[k] }))

  const PALETA = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#f43f5e', '#14b8a6']
  const barrasZonas = [
    ...COMUNAS.map((c) => ({ label: c, value: db.personas.filter((p) => p.comuna === c).length, color: '#0ea5e9' })),
    ...CORREGIMIENTOS.map((c) => ({ label: c, value: db.personas.filter((p) => p.corregimiento === c).length, color: '#10b981' })),
  ].sort((a, b) => b.value - a.value)
  const barrasLideres = LIDERES_INFO.map((l, i) => ({
    label: l.nombres,
    value: db.personas.filter((p) => p.liderId === l.id).length,
    color: PALETA[i % PALETA.length],
  })).sort((a, b) => b.value - a.value)
  const barrasBarrios = BARRIOS.map((b) => ({ label: b, value: db.personas.filter((p) => p.barrio === b).length, color: '#8b5cf6' })).sort((a, b) => b.value - a.value)
  const barrasPuestos = PUESTOS.map((p) => ({ label: p.id, value: db.personas.filter((x) => x.puesto === p.id).length, color: '#f59e0b' })).sort((a, b) => b.value - a.value)

  const dims: Record<string, { titulo: string; data: { label: string; value: number; color: string }[] }> = {
    zona: { titulo: 'Simpatizantes por comuna / corregimiento', data: barrasZonas },
    lider: { titulo: 'Simpatizantes por líder', data: barrasLideres },
    barrio: { titulo: 'Simpatizantes por barrio', data: barrasBarrios },
    puesto: { titulo: 'Simpatizantes por puesto de votación', data: barrasPuestos },
    vehiculo: { titulo: 'Vehículos a disposición por tipo', data: barrasVeh },
  }

  const totalEnvios = db.comunicaciones.length
  const totalDest = db.comunicaciones.reduce((s, c) => s + (c.destinatarios || 0), 0)
  const porCanal: Record<string, number> = {}
  db.comunicaciones.forEach((c) => { porCanal[c.canal] = (porCanal[c.canal] || 0) + 1 })
  const recientes = [...db.comunicaciones].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5)

  const monitoreoPadrinos = db.padrinos.filter((p) => p.activo).map((p) => {
    const lideres = lideresDePadrino(db, p.id)
    const ids = new Set(lideres.map((l) => l.id))
    const fichas = db.personas.filter((x) => x.liderId && ids.has(x.liderId))
    const incompletas = fichas.filter((x) => camposFaltantes(x).length > 0).length
    const planillas = db.planillas.filter((pl) => pl.padrinoId === p.id)
    const pendientes = planillas.filter((pl) => pl.estado === 'entregada').length
    const pctCompleto = fichas.length ? Math.round(((fichas.length - incompletas) / fichas.length) * 100) : 100
    return { ...p, lideres: lideres.length, fichas: fichas.length, incompletas, planillas: planillas.length, pendientes, pctCompleto }
  })

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <Kpi icon={Users} label="Simpatizantes" value={total} accent="text-blue-600" onClick={() => irADirectorio({})} />
        <Kpi icon={BadgeCheck} label="Válidos (Valledupar)" value={validos} accent="text-emerald-600" onClick={() => irADirectorio({ validez: 'valido' })} />
        <Kpi icon={CheckCircle2} label="Firmes válidos" value={firmesValidos} accent="text-slate-700" onClick={() => irADirectorio({ nivelVoto: 'Firme', validez: 'valido' })} />
        <Kpi icon={Clock} label="Gestiones pendientes" value={gestionesPendientes} accent="text-amber-600" onClick={() => irAGestiones({ estado: 'Pendiente' })} />
        <Kpi icon={Cake} label="Cumpleañeros (7 días)" value={cumples.length} accent="text-pink-600" onClick={() => setShowCumples(true)} />
        <Kpi icon={Wallet} label="Total invertido" value={fmtCOP(invertido)} accent="text-amber-600" onClick={() => irAGestiones({ conMonto: 'con' })} />
      </div>

      <Card
        title={`📊 ${dims[dim].titulo}`}
        action={
          <select
            value={dim}
            onChange={(e) => setDim(e.target.value as 'zona' | 'lider' | 'barrio' | 'puesto' | 'vehiculo')}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="zona">Comuna / Corregimiento</option>
            <option value="lider">Líder</option>
            <option value="barrio">Barrio</option>
            <option value="puesto">Puesto de votación</option>
            <option value="vehiculo">Vehículo (por tipo)</option>
          </select>
        }
        className="mb-4"
      >
        <BarsScroll data={dims[dim].data} />
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title="Validez del electorado (Concejo de Valledupar)">
          <div className="flex items-center gap-4">
            <div className="w-40 h-40 shrink-0">
              <Donut data={donaVal} />
            </div>
            <div className="flex-1">
              <Legend data={donaVal} />
            </div>
          </div>
        </Card>
        <Card title="Nivel académico de la base">
          <div className="flex items-center gap-4">
            <div className="w-40 h-40 shrink-0">
              <Donut data={donaNivel} />
            </div>
            <div className="flex-1">
              <Legend data={donaNivel} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title="Registros por municipio">
          <Bars data={barrasMun} />
        </Card>
        <Card title="Gestiones por categoría">
          <div className="flex items-center gap-4">
            <div className="w-40 h-40 shrink-0">
              <Donut data={donaCat} />
            </div>
            <div className="flex-1">
              <Legend data={donaCat} />
            </div>
          </div>
        </Card>
      </div>

      <Card title="🛡️ Monitoreo de padrinos (mesa de datos)" className="mb-4">
        <p className="text-xs text-slate-500 mb-3">Trabajo de cada padrino: captura, completitud y planillas por procesar.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-slate-50">
              <tr>
                {['Padrino', 'Líderes', 'Fichas', 'Incompletas', 'Planillas', 'Pendientes', 'Avance de completitud'].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monitoreoPadrinos.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2.5 text-sm font-semibold text-slate-800">{p.nombre}</td>
                  <td className="px-3 py-2.5 text-sm">{p.lideres}</td>
                  <td className="px-3 py-2.5 text-sm">{p.fichas}</td>
                  <td className="px-3 py-2.5">
                    {p.incompletas > 0 ? <Badge className="bg-amber-100 text-amber-700">{p.incompletas}</Badge> : <Badge className="bg-emerald-100 text-emerald-700">0</Badge>}
                  </td>
                  <td className="px-3 py-2.5 text-sm">{p.planillas}</td>
                  <td className="px-3 py-2.5">
                    {p.pendientes > 0 ? <Badge className="bg-red-100 text-red-700">{p.pendientes}</Badge> : <Badge className="bg-slate-100 text-slate-600">0</Badge>}
                  </td>
                  <td className="px-3 py-2.5 min-w-[160px]">
                    <div className="flex items-center gap-2">
                      <ProgressBar pct={p.pctCompleto} color={p.pctCompleto === 100 ? 'bg-emerald-500' : p.pctCompleto >= 70 ? 'bg-amber-500' : 'bg-red-500'} />
                      <span className="text-xs font-semibold text-slate-600 w-10">{p.pctCompleto}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="📣 Comunicaciones enviadas"
        action={
          <button onClick={() => navigate('comunicaciones')} className="text-xs text-blue-600 hover:underline font-medium whitespace-nowrap">
            Ver historial →
          </button>
        }
        className="mb-4"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xl font-extrabold text-blue-700">{totalEnvios}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Envíos totales</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xl font-extrabold text-emerald-700">{totalDest}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Destinatarios</div>
          </div>
          {Object.entries(CANAL_COLORS).map(([canal, color]) => (
            <div key={canal} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xl font-extrabold text-slate-800">{porCanal[canal] || 0}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">{canal.replace(' API', '')}</div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="bg-slate-50">
              <tr>
                {['Fecha', 'Canal', 'Segmento', 'Mensaje', 'Destinatarios'].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2 border-b border-slate-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recientes.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm whitespace-nowrap text-slate-600">{fmtFechaHora(c.fecha)}</td>
                  <td className="px-3 py-2 text-sm whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CANAL_COLORS[c.canal] ?? '#94a3b8' }} />
                      {c.canal}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 max-w-[200px] truncate" title={c.segmento}>{c.segmento}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 max-w-[260px] truncate" title={c.mensaje}>{c.mensaje}</td>
                  <td className="px-3 py-2 text-sm font-semibold text-slate-700">{c.destinatarios}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={showCumples}
        onClose={() => setShowCumples(false)}
        title="🎂 Cumpleaños próximos (7 días)"
        subtitle={`${cumples.length} contacto(s) por saludar`}
        footer={
          <button
            onClick={() => {
              setShowCumples(false)
              irAComunicaciones({ cumpleanos: true })
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-pink-600 text-white hover:bg-pink-700"
          >
            <Send className="w-4 h-4" /> Enviar saludo a cumpleañeros
          </button>
        }
      >
        <Cumpleanos items={cumples} />
      </Modal>
    </div>
  )
}
