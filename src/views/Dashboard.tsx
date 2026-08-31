import { useMemo } from 'react'
import { BadgeCheck, Car, CheckCircle2, GraduationCap, Users, Wallet } from 'lucide-react'
import { useApp } from '../store'
import { COMUNAS, CORREGIMIENTOS, NIVELES_ACADEMICOS, cumpleanerosSemana, esValido, validezDe } from '../data'
import { fmtCOP } from '../lib'
import { Bars, Card, Donut, Kpi, Legend } from '../components/ui'
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

export default function Dashboard() {
  const { db } = useApp()

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
  const firmes = db.personas.filter((p) => p.nivelVoto === 'Firme').length
  const firmesValidos = db.personas.filter((p) => p.nivelVoto === 'Firme' && esValido(p)).length
  const profesionales = db.personas.filter((p) => p.nivelAcademico === 'Profesional').length
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

  const zonas = [
    ...COMUNAS.map((c) => ({ label: c, n: db.personas.filter((p) => p.comuna === c).length, color: 'bg-blue-500' })),
    ...CORREGIMIENTOS.map((c) => ({ label: c, n: db.personas.filter((p) => p.corregimiento === c).length, color: 'bg-emerald-500' })),
  ]

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <Kpi icon={Users} label="Simpatizantes" value={total} accent="text-blue-600" />
        <Kpi icon={BadgeCheck} label="% Válidos (Valledupar)" value={`${Math.round((validos / total) * 100)}%`} accent="text-emerald-600" />
        <Kpi icon={CheckCircle2} label="Votos firmes (totales)" value={firmes} accent="text-slate-700" />
        <Kpi icon={BadgeCheck} label="Firmes válidos" value={firmesValidos} accent="text-emerald-600" />
        <Kpi icon={GraduationCap} label="% Profesionales" value={`${Math.round((profesionales / total) * 100)}%`} accent="text-indigo-600" />
        <Kpi icon={Wallet} label="Total invertido" value={fmtCOP(invertido)} accent="text-amber-600" />
      </div>

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

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title="Vehículos a disposición por tipo">
          <Bars data={barrasVeh} />
        </Card>
        <Card title="🗺️ Valledupar por comuna / corregimiento">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {zonas.map((z) => (
              <div key={z.label} className={`rounded-lg p-2 ${z.color} text-white`}>
                <div className="text-xs font-semibold truncate">{z.label}</div>
                <div className="text-[10px] opacity-90">{z.n} fichas</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="🎂 Cumpleaños próximos (7 días)">
        <Cumpleanos items={cumples} />
      </Card>
    </div>
  )
}
