import { useMemo, useState } from 'react'
import { Award, BadgeCheck, ChevronLeft, ChevronRight, GraduationCap, Search, Wrench } from 'lucide-react'
import { useApp } from '../store'
import { NIVELES_ACADEMICOS, POSGRADOS, esValido, validezDe } from '../data'
import { Badge, Kpi, nivelAcademicoTone, validezLabel, validezTone } from '../components/ui'

const PER_PAGE = 50

export default function Talento() {
  const { db, verPerfil } = useApp()
  const [nivel, setNivel] = useState('all')
  const [posgrado, setPosgrado] = useState('all')
  const [soloValidos, setSoloValidos] = useState(false)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const setN = (v: string) => {
    setNivel(v)
    setPage(1)
  }
  const setP = (v: string) => {
    setPosgrado(v)
    setPage(1)
  }
  const setSV = (v: boolean) => {
    setSoloValidos(v)
    setPage(1)
  }

  const personas = useMemo(() => {
    let l = db.personas.filter((p) => p.profesion !== 'Sin profesión')
    if (nivel !== 'all') l = l.filter((p) => p.nivelAcademico === nivel)
    if (posgrado !== 'all') l = l.filter((p) => p.posgrado === posgrado)
    if (soloValidos) l = l.filter((p) => esValido(p))
    if (q.trim()) l = l.filter((p) => `${p.nombres} ${p.apellidos} ${p.profesion} ${p.municipio}`.toLowerCase().includes(q.trim().toLowerCase()))
    return l.sort((a, b) => a.apellidos.localeCompare(b.apellidos))
  }, [db, nivel, posgrado, soloValidos, q])

  const totalPages = Math.max(1, Math.ceil(personas.length / PER_PAGE))
  const current = Math.min(page, totalPages)
  const paginado = personas.slice((current - 1) * PER_PAGE, current * PER_PAGE)

  const conProfesion = db.personas.filter((p) => p.profesion !== 'Sin profesión').length
  const profesionales = db.personas.filter((p) => p.nivelAcademico === 'Profesional').length
  const tecnologos = db.personas.filter((p) => p.nivelAcademico === 'Tecnólogo').length
  const tecnicos = db.personas.filter((p) => p.nivelAcademico === 'Técnico').length
  const conPosgrado = db.personas.filter((p) => p.posgrado !== 'Ninguno').length

  const selCls = 'w-auto border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500'

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Talento de la base: profesionales, tecnólogos y técnicos para armar <b>comités</b>, buscar <b>testimonios</b> y
        voceros por perfil.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Kpi icon={GraduationCap} label="Con profesión" value={conProfesion} accent="text-blue-600" />
        <Kpi icon={BadgeCheck} label="Profesionales" value={profesionales} accent="text-indigo-600" />
        <Kpi icon={Award} label="Tecnólogos" value={tecnologos} accent="text-sky-600" />
        <Kpi icon={Wrench} label="Técnicos" value={tecnicos} accent="text-teal-600" />
        <Kpi icon={GraduationCap} label="Con posgrado" value={conPosgrado} accent="text-purple-600" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar persona o profesión..."
            className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select value={nivel} onChange={(e) => setN(e.target.value)} className={selCls}>
          <option value="all">Todo nivel académico</option>
          {NIVELES_ACADEMICOS.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <select value={posgrado} onChange={(e) => setP(e.target.value)} className={selCls}>
          <option value="all">Todo posgrado</option>
          {POSGRADOS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1.5 text-sm text-slate-700">
          <input type="checkbox" checked={soloValidos} onChange={(e) => setSV(e.target.checked)} className="accent-blue-600" />
          Solo válidos (Valledupar)
        </label>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50">
              <tr>
                {['Nombre', 'Ciudad de residencia', 'Ocupación', 'Profesión', 'Nivel académico', 'Posgrado', 'Validez'].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginado.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-slate-400 text-sm text-center">
                    Sin resultados para los filtros aplicados.
                  </td>
                </tr>
              )}
              {paginado.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 border-b border-slate-100">
                  <td className="px-3 py-2.5 text-sm">
                    <button onClick={() => verPerfil(p.id)} className="text-left font-medium text-blue-600 hover:underline">
                      {p.nombres} {p.apellidos}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-slate-600">{p.municipio}</td>
                  <td className="px-3 py-2.5 text-sm text-slate-600">{p.ocupacion}</td>
                  <td className="px-3 py-2.5 text-sm font-medium text-slate-800">{p.profesion}</td>
                  <td className="px-3 py-2.5">
                    <Badge className={nivelAcademicoTone(p.nivelAcademico)}>{p.nivelAcademico}</Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    {p.posgrado === 'Ninguno' ? (
                      <span className="text-slate-400 text-sm">—</span>
                    ) : (
                      <Badge className="bg-purple-100 text-purple-700">{p.posgrado}</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge className={validezTone(validezDe(p))}>{validezLabel(validezDe(p))}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <p className="text-xs text-slate-500">
          Mostrando <b>{personas.length === 0 ? 0 : (current - 1) * PER_PAGE + 1}–{Math.min(current * PER_PAGE, personas.length)}</b> de{' '}
          <b>{personas.length}</b> · {PER_PAGE} por página
        </p>
        <div className="flex items-center gap-1">
          <button
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="px-2 text-sm text-slate-600">
            Página {current} de {totalPages}
          </span>
          <button
            disabled={current === totalPages}
            onClick={() => setPage(current + 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
