import { ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../../store'
import { DEPARTAMENTO_CAMPANA, MUNICIPIO_CAMPANA } from '../../../data'
import { Modal } from '../../../components/ui'
import Directorio from '../../simpatizantes/pages/DirectorioPage'
import type { SimpatizanteApi } from '../../../types'

const esValido = (p: SimpatizanteApi) => p.departamento === DEPARTAMENTO_CAMPANA && p.municipio === MUNICIPIO_CAMPANA
const sinPuestoMesa = (p: SimpatizanteApi) => !p.puesto || !p.mesa
const sinTelefono = (p: SimpatizanteApi) => !p.telefono?.trim()
const sinGrupo = (p: SimpatizanteApi) => p.gruposSociales.length === 0
const sinOcupacion = (p: SimpatizanteApi) => !p.ocupacion?.trim()
const incompleto = (p: SimpatizanteApi) => sinPuestoMesa(p) || sinTelefono(p) || sinGrupo(p) || sinOcupacion(p)
const COLORES = ['#2563eb', '#7c3aed', '#0d9488', '#f59e0b', '#dc2626', '#059669', '#db2777', '#4f46e5']

const IconoDashboard = () => <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" /><rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" /><rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" /><rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" /></svg>
const IconoDirectorio = () => <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M4 6h2M9 6h11M4 12h2M9 12h11M4 18h2M9 18h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>

// Pantalla de inicio del gestor: dashboard de sus fichas a cargo y directorio para completarlas.
export default function GestorAsignacionesPage() {
  const { simpatizantesApi, cargarSimpatizantesApi, cargandoSimpatizantes, lideresApi, cargarLideresApi, openPersona } = useApp()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void cargarSimpatizantesApi(); void cargarLideresApi() }, [])
  const [tab, setTab] = useState<'dashboard' | 'directorio'>('dashboard')
  const [detalle, setDetalle] = useState<{ titulo: string; filtro: (p: SimpatizanteApi) => boolean } | null>(null)

  // Solo las fichas de simpatizantes (no el personal de la campaña).
  const fichas = useMemo(() => simpatizantesApi.filter((p) => (p.rol ?? 'simpatizante') === 'simpatizante'), [simpatizantesApi])
  const validos = fichas.filter(esValido)
  const votaron = validos.filter((p) => p.votoRegistrado).length
  const completos = fichas.filter((p) => !sinPuestoMesa(p) && !sinTelefono(p)).length
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)
  const duplicadas = useMemo(() => {
    const n = new globalThis.Map<string, number>()
    for (const p of simpatizantesApi) n.set(p.cedula, (n.get(p.cedula) ?? 0) + 1)
    return (p: SimpatizanteApi) => (n.get(p.cedula) ?? 0) > 1
  }, [simpatizantesApi])

  const accionables: [string, (p: SimpatizanteApi) => boolean][] = [
    ['Pendientes de votar', (p) => esValido(p) && !p.votoRegistrado],
    ['Sin puesto/mesa de votación', sinPuestoMesa],
    ['Sin teléfono', sinTelefono],
    ['Sin grupo social', sinGrupo],
    ['Sin ocupación', sinOcupacion],
    ['Cédulas duplicadas', duplicadas],
  ]

  const porLider = useMemo(() => {
    const nombres = new globalThis.Map(lideresApi.map((l) => [l.id, `${l.nombres} ${l.apellidos}`]))
    const conteo = new globalThis.Map<string, number>()
    for (const p of fichas.filter(incompleto)) {
      const k = (p.liderId && nombres.get(p.liderId)) || p.trazabilidad?.lider?.nombre || 'Sin líder'
      conteo.set(k, (conteo.get(k) ?? 0) + 1)
    }
    return [...conteo].sort((a, b) => b[1] - a[1])
  }, [fichas, lideresApi])
  const maxLider = Math.max(1, ...porLider.map(([, n]) => n))

  const tabCls = (activo: boolean) => `flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${activo ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`
  const lista = detalle ? fichas.filter(detalle.filtro).sort((a, b) => a.nombres.localeCompare(b.nombres)) : []

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mis Asignaciones</h1>
        <p className="mb-1 text-sm text-gray-500">Simpatizantes de los líderes que tienes asignados. Puedes mejorar su caracterización (perfil, ocupación, intereses, grupos sociales, puesto/mesa de votación) para apoyar la toma de decisiones de la campaña — no puedes editar datos básicos de identidad ni eliminar registros.</p>
        <p className="mb-4 text-sm text-gray-500">Día E: activa la columna <span className="font-medium text-gray-700">"¿Ya votó?"</span> (grupo Día E) desde "Columnas" para ir marcando quién ya votó (solo se habilita el 15/09/2026). Llevas <span className="font-semibold text-gray-900">{votaron}</span> de <span className="font-semibold text-gray-900">{validos.length}</span> simpatizantes válidos con voto confirmado.</p>
        <div className="mb-5 flex gap-2">
          <button type="button" onClick={() => setTab('dashboard')} className={tabCls(tab === 'dashboard')}><IconoDashboard />Dashboard</button>
          <button type="button" onClick={() => setTab('directorio')} className={tabCls(tab === 'directorio')}><IconoDirectorio />Directorio</button>
        </div>

        {tab === 'directorio' ? <Directorio /> : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {([
                ['Simpatizantes a cargo', fichas.length, 'text-gray-900', ''],
                ['Válidos', validos.length, 'text-emerald-600', `${pct(validos.length, fichas.length)}% del total`],
                ['Ya votaron (Día E)', votaron, 'text-gray-900', ''],
                ['Datos completos', `${pct(completos, fichas.length)}%`, 'text-gray-900', 'Puesto, mesa y teléfono'],
              ] as const).map(([t, v, c, d]) => (
                <div key={t} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t}</p>
                  <p className={`mt-2 text-2xl font-semibold ${c}`}>{cargandoSimpatizantes && !fichas.length ? '…' : v}</p>
                  {d && <p className="mt-1 text-xs text-gray-400">{d}</p>}
                </div>
              ))}
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-gray-700">Accionables — cosas por ajustar</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
                {accionables.map(([titulo, filtro]) => (
                  <button key={titulo} type="button" onClick={() => setDetalle({ titulo, filtro })} className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{titulo} — {fichas.filter(filtro).length}</p>
                    <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-blue-700">Ver detalle<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></p>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">Puesto/mesa, grupo social y ocupación los puedes editar tú mismo desde la ficha. El teléfono y las cédulas duplicadas no los puedes modificar — repórtalos a tu líder o al administrador.</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-800">Simpatizantes con datos incompletos por líder</p>
              <p className="text-xs text-gray-400">Puesto/mesa, teléfono, grupo social u ocupación faltante — para priorizar con quién hablar primero</p>
              <div className="mt-4 space-y-3">
                {porLider.length === 0 && <p className="py-8 text-center text-sm text-gray-400">{cargandoSimpatizantes ? 'Cargando…' : 'Todas las fichas tienen los datos completos. 🎉'}</p>}
                {porLider.map(([lider, n], i) => (
                  <div key={lider} className="flex items-center gap-3 text-xs">
                    <span className="w-40 shrink-0 text-right text-gray-500">{lider}</span>
                    <div className="h-8 flex-1 rounded bg-gray-50"><div className="h-8 rounded" style={{ width: `${(n / maxLider) * 100}%`, backgroundColor: COLORES[i % COLORES.length] }} /></div>
                    <span className="w-8 text-gray-500">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={detalle?.titulo ?? ''} subtitle={`${lista.length} simpatizante(s) — haz clic en el nombre para completar la ficha`} wide>
        {lista.length === 0 ? <p className="py-8 text-center text-sm text-emerald-700">Nada por ajustar aquí ✅</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500"><tr>{['Nombre', 'Cédula', 'Teléfono', 'Barrio', 'Puesto', 'Mesa', 'Líder'].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{lista.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-3 py-2"><button type="button" onClick={() => { setDetalle(null); openPersona({ mode: 'edit', personaId: p.id }) }} className="font-medium text-blue-700 hover:underline">{p.nombres} {p.apellidos}</button></td>
                <td className="px-3 py-2 text-gray-600">{p.cedula}</td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-600">{p.telefono || '—'}</td>
                <td className="px-3 py-2 text-gray-600">{p.barrio || '—'}</td>
                <td className="px-3 py-2 text-gray-600">{p.puesto || '—'}</td>
                <td className="px-3 py-2 text-gray-600">{p.mesa ?? '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-600">{p.trazabilidad?.lider?.nombre ?? '—'}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Modal>
    </main>
  )
}
