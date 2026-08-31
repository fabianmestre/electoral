import { AlertTriangle, BadgeCheck, CheckCircle2, Handshake, Users } from 'lucide-react'
import { useApp } from '../store'
import {
  LIDERES_INFO,
  cumpleanerosSemana,
  firmesDe,
  firmesValidosDe,
  gestionesDeLider,
  invalidosDe,
  totalDe,
} from '../data'
import { Card, Kpi, ProgressBar } from '../components/ui'
import Cumpleanos from '../components/Cumpleanos'

export default function LiderDash() {
  const { db, session } = useApp()
  const l = LIDERES_INFO.find((x) => x.id === session?.liderId)
  if (!l) return null

  const total = totalDe(db, l.id)
  const firmes = firmesDe(db, l.id)
  const firmesV = firmesValidosDe(db, l.id)
  const invalidos = invalidosDe(db, l.id)
  const ges = gestionesDeLider(db, l.id)
  const pct = Math.min(100, Math.round((firmesV / l.meta) * 100))
  const indecisos = db.personas.filter((p) => p.liderId === l.id && p.nivelVoto === 'Indeciso').length
  const riesgo = db.personas.filter((p) => p.liderId === l.id && p.nivelVoto === 'En Riesgo').length
  const cumples = cumpleanerosSemana(db).filter((x) => x.p.liderId === l.id)

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-2xl p-6 text-white mb-4">
        <div className="text-sm text-blue-100">Hola, {session?.nombre} 👋 · {l.territorio}</div>
        <h2 className="text-2xl font-extrabold mt-1">Tu meta: {l.meta} votos firmes válidos</h2>
        <div className="flex items-end gap-2 mt-3">
          <span className="text-5xl font-extrabold">{firmesV}</span>
          <span className="text-blue-200 mb-1">/ {l.meta}</span>
        </div>
        <div className="w-full bg-white/25 rounded-full h-4 mt-3">
          <div className="h-4 rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-sm text-blue-100 mt-2">{pct}% de avance</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi icon={Users} label="Registrados" value={total} accent="text-blue-600" />
        <Kpi icon={CheckCircle2} label="Firmes (totales)" value={firmes} accent="text-slate-700" />
        <Kpi icon={BadgeCheck} label="Firmes válidos" value={firmesV} accent="text-emerald-600" />
        <Kpi icon={Handshake} label="Gestiones" value={ges} accent="text-amber-600" />
      </div>

      {invalidos > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          Tienes <b>{invalidos} registros fuera del electorado de Valledupar</b> (otro municipio o departamento). Esos
          votos firmes NO cuentan para tu meta.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Nivel de voto de tu base">
          <div className="space-y-3">
            <Nivel label="Firme" n={firmes} total={total} color="bg-emerald-500" />
            <Nivel label="Indeciso" n={indecisos} total={total} color="bg-amber-500" />
            <Nivel label="En Riesgo" n={riesgo} total={total} color="bg-red-500" />
          </div>
        </Card>
        <Card title="🎂 Cumpleaños de tu zona (7 días)">
          <Cumpleanos items={cumples} />
        </Card>
      </div>
    </div>
  )
}

function Nivel({ label, n, total, color }: { label: string; n: number; total: number; color: string }) {
  const pct = total ? Math.round((n / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium">{label}</span>
        <span>
          {n} ({pct}%)
        </span>
      </div>
      <ProgressBar pct={pct} color={color} />
    </div>
  )
}
