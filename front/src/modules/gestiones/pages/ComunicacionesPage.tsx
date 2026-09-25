import { CircleDot, History, Mail, Search, Send, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../../store'
import { DEPARTAMENTO_CAMPANA, MUNICIPIO_CAMPANA } from '../../../data'
import { Modal } from '../../../components/ui'
import { confirmar } from '../../../components/ConfirmDialog'
import { ROL_SIMPATIZANTE_LABEL } from '../../../types'
import type { RolSimpatizante, SimpatizanteApi } from '../../../types'

interface Envio {
  id: string | null; canal: string; mensaje: string; segmento: string | null; total: number; enviados: number
  fallidos: number; omitidos: number; creadoEn: string; autor: string | null
  detalle: { simpatizanteId: string | null; nombre: string | null; numero: string | null; estado: string; error?: string }[]
}

const esValido = (p: SimpatizanteApi) => p.departamento === DEPARTAMENTO_CAMPANA && p.municipio === MUNICIPIO_CAMPANA
// Mismo criterio que el backend: celular colombiano de 10 dígitos que empieza por 3.
const celularValido = (t: string | null | undefined) => { const d = String(t ?? '').replace(/\D/g, ''); return /^3\d{9}$/.test(d.length === 12 && d.startsWith('57') ? d.slice(2) : d) }
// Tildes, ñ y otros caracteres fuera de GSM-7 obligan a SMS Unicode (70 caracteres por mensaje).
const esGsm = (t: string) => /^[A-Za-z0-9 @£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€]*$/.test(t)
const partesSms = (t: string) => { const gsm = esGsm(t); const n = t.length; if (!n) return 0; return n <= (gsm ? 160 : 70) ? 1 : Math.ceil(n / (gsm ? 153 : 67)) }

const selCls = 'mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500'
const FILTROS_VACIOS = { rol: 'all', validez: 'all', liderId: 'all', municipio: 'all', sector: 'all', barrio: 'all', nivelVoto: 'all', voto: 'all' }

async function api<T>(options: RequestInit = {}): Promise<T> {
  const response = await fetch('/api/comunicaciones', {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('electoral.auth.token')}`, ...options.headers },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'No se pudo completar el envío.')
  return data
}

export default function ComunicacionesPage() {
  const { simpatizantesApi, cargarSimpatizantesApi, lideresApi, cargarLideresApi, notify } = useApp()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void cargarSimpatizantesApi(); void cargarLideresApi() }, [])
  const [tab, setTab] = useState<'segmento' | 'individual' | 'historial'>('segmento')
  const [channel, setChannel] = useState('SMS')
  const [message, setMessage] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [showFiltros, setShowFiltros] = useState(false)
  const [f, setF] = useState(FILTROS_VACIOS)
  const [busqueda, setBusqueda] = useState('')
  const [elegidos, setElegidos] = useState<SimpatizanteApi[]>([])
  const [numero, setNumero] = useState('')
  const [historial, setHistorial] = useState<Envio[]>([])
  const [cargandoHist, setCargandoHist] = useState(false)
  const [detalle, setDetalle] = useState<Envio | null>(null)

  const cargarHistorial = () => {
    setCargandoHist(true)
    api<{ items: Envio[] }>().then((d) => setHistorial(d.items))
      .catch((e) => notify(e instanceof Error ? e.message : 'No se pudo cargar el historial.', 'error'))
      .finally(() => setCargandoHist(false))
  }
  useEffect(() => { if (tab === 'historial') cargarHistorial() }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const nombreLider = (id: string | null) => { const l = lideresApi.find((x) => x.id === id); return l ? `${l.nombres} ${l.apellidos}` : null }
  const sector = (p: SimpatizanteApi) => p.comuna || p.corregimiento || null
  const opciones = (clave: (p: SimpatizanteApi) => string | null | undefined) => [...new Set(simpatizantesApi.map(clave).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))

  const segmento = useMemo(() => simpatizantesApi.filter((p) =>
    (f.rol === 'all' || (p.rol ?? 'simpatizante') === f.rol)
    && (f.validez === 'all' || (f.validez === 'valido') === esValido(p))
    && (f.liderId === 'all' || p.liderId === f.liderId)
    && (f.municipio === 'all' || p.municipio === f.municipio)
    && (f.sector === 'all' || sector(p) === f.sector)
    && (f.barrio === 'all' || p.barrio === f.barrio)
    && (f.nivelVoto === 'all' || p.nivelVoto === f.nivelVoto)
    && (f.voto === 'all' || (f.voto === 'si') === p.votoRegistrado),
  ), [simpatizantesApi, f])
  const conCelular = segmento.filter((p) => celularValido(p.telefono)).length

  const etiquetas: Record<string, (v: string) => string> = {
    rol: (v) => `Rol: ${ROL_SIMPATIZANTE_LABEL[v as RolSimpatizante]}`, validez: (v) => (v === 'valido' ? 'Válidos' : 'Inválidos'),
    liderId: (v) => `Líder: ${nombreLider(v) ?? v}`, municipio: (v) => `Municipio: ${v}`, sector: (v) => `Comuna/Correg.: ${v}`,
    barrio: (v) => `Barrio: ${v}`, nivelVoto: (v) => `Nivel de voto: ${v}`, voto: (v) => (v === 'si' ? 'Ya votaron' : 'Aún no votan'),
  }
  const aplicados = Object.entries(f).filter(([, v]) => v !== 'all').map(([k, v]) => etiquetas[k](v))

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (q.length < 2) return []
    return simpatizantesApi.filter((p) => !elegidos.some((e) => e.id === p.id) && `${p.nombres} ${p.apellidos} ${p.cedula} ${p.telefono ?? ''}`.toLowerCase().includes(q)).slice(0, 6)
  }, [simpatizantesApi, busqueda, elegidos])
  const numeroValido = celularValido(numero)

  const destinatarios = tab === 'segmento' ? conCelular : elegidos.filter((p) => celularValido(p.telefono)).length + (numeroValido ? 1 : 0)
  const partes = partesSms(message)
  const puedeEnviar = channel === 'SMS' && !!message.trim() && destinatarios > 0 && !enviando && tab !== 'historial'

  const enviar = async () => {
    const texto = tab === 'segmento'
      ? `Se enviará un SMS a ${conCelular} destinatario(s) del segmento${segmento.length > conCelular ? ` (${segmento.length - conCelular} sin celular válido se omiten)` : ''}. Cada SMS tiene costo y no se puede cancelar una vez enviado.`
      : `Se enviará un SMS a ${destinatarios} destinatario(s). Cada SMS tiene costo y no se puede cancelar una vez enviado.`
    if (!(await confirmar({ titulo: 'Confirmar envío', mensaje: texto, confirmar: `Enviar ${destinatarios} SMS` }))) return
    setEnviando(true)
    try {
      const body = tab === 'segmento'
        ? { canal: 'SMS', mensaje: message, simpatizanteIds: segmento.map((p) => p.id), segmento: aplicados.join(' · ') || 'Todos los simpatizantes' }
        : { canal: 'SMS', mensaje: message, simpatizanteIds: elegidos.map((p) => p.id), numeros: numeroValido ? [numero] : [], segmento: 'Envío individual' }
      const r = await api<Envio>({ method: 'POST', body: JSON.stringify(body) })
      notify(`SMS enviados: ${r.enviados}${r.fallidos ? ` · fallidos: ${r.fallidos}` : ''}${r.omitidos ? ` · omitidos: ${r.omitidos}` : ''}`, r.fallidos ? 'warn' : 'success')
      setMessage(''); setElegidos([]); setNumero('')
      setDetalle(r)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo completar el envío.', 'error')
    } finally {
      setEnviando(false)
    }
  }

  const tabCls = (activo: boolean) => `flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${activo ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`
  const filtroSelect = (label: string, k: keyof typeof FILTROS_VACIOS, opts: [string, string][]) => (
    <label className="text-xs font-medium text-gray-600">{label}<select className={selCls} value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))}><option value="all">Todos</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
  )

  const redactar = (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-800"><Mail className="h-4 w-4" /> Redactar y enviar</p>
      <div className="space-y-3">
        <div><label className="mb-1 block text-xs font-medium text-gray-500">Canal</label>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
            <option value="SMS">SMS</option>
          </select></div>
        <div><label className="mb-1 block text-xs font-medium text-gray-500">Mensaje</label>
          <textarea rows={7} maxLength={459} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escribe el mensaje que se enviará…" className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <p className="mt-1 flex justify-between text-[11px] text-gray-400"><span>{message && !esGsm(message) ? 'Tildes o ñ: el SMS usa formato Unicode (70 caracteres por SMS).' : 'Hasta 160 caracteres por SMS.'}</span><span>{message.length} caracteres · {partes} SMS por destinatario</span></p></div>
        <button type="button" onClick={() => void enviar()} disabled={!puedeEnviar} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"><Send className="h-4 w-4" />{enviando ? 'Enviando…' : destinatarios ? `Enviar a ${destinatarios}` : 'Enviar'}</button>
      </div>
    </div>
  )

  return <main className="flex-1 overflow-y-auto p-6"><div>
    <div className="mb-6"><h1 className="text-xl font-semibold text-gray-900">Comunicaciones</h1><p className="text-sm text-gray-500">Envíos masivos segmentados</p></div>
    <div className="mb-5 flex flex-wrap gap-2">
      <button onClick={() => setTab('segmento')} className={tabCls(tab === 'segmento')}><CircleDot className="h-4 w-4" />Envío a segmento</button>
      <button onClick={() => setTab('individual')} className={tabCls(tab === 'individual')}><UserRound className="h-4 w-4" />Envío individual</button>
      <button onClick={() => setTab('historial')} className={tabCls(tab === 'historial')}><History className="h-4 w-4" />Historial</button>
    </div>

    {tab === 'segmento' && <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-800"><CircleDot className="h-4 w-4 text-blue-600" /> Segmentación</p>
        <div className="mb-3 flex gap-2"><button onClick={() => setShowFiltros((v) => !v)} className={`rounded-lg border px-3 py-2 text-sm font-medium ${showFiltros || aplicados.length ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'}`}>Filtros{aplicados.length ? ` (${aplicados.length})` : ''}</button>{aplicados.length > 0 && <button onClick={() => setF(FILTROS_VACIOS)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"><X className="h-4 w-4" />Limpiar</button>}</div>
        {showFiltros && <div className="mb-3 grid grid-cols-2 gap-3">
          {filtroSelect('Rol', 'rol', (Object.keys(ROL_SIMPATIZANTE_LABEL) as RolSimpatizante[]).map((r) => [r, ROL_SIMPATIZANTE_LABEL[r]]))}
          {filtroSelect('Validez', 'validez', [['valido', 'Válidos'], ['invalido', 'Inválidos']])}
          {filtroSelect('Líder', 'liderId', lideresApi.filter((l) => l.activo).map((l) => [l.id, `${l.nombres} ${l.apellidos}`]))}
          {filtroSelect('Municipio', 'municipio', opciones((p) => p.municipio).map((v) => [v, v]))}
          {filtroSelect('Comuna/Corregimiento', 'sector', opciones(sector).map((v) => [v, v]))}
          {filtroSelect('Barrio', 'barrio', opciones((p) => p.barrio).map((v) => [v, v]))}
          {filtroSelect('Nivel de voto', 'nivelVoto', [['Firme', 'Firme'], ['Indeciso', 'Indeciso'], ['En Riesgo', 'En Riesgo']])}
          {filtroSelect('¿Ya votó?', 'voto', [['si', 'Ya votaron'], ['no', 'Aún no votan']])}
        </div>}
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-600">Destinatarios</p><p className="text-2xl font-bold text-blue-700">{conCelular}</p></div>
          {segmento.length > conCelular && <p className="mt-1 text-xs text-amber-700">{segmento.length} en el segmento · {segmento.length - conCelular} sin celular válido se omiten</p>}
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Filtros aplicados</p>
          <p className="mt-1 text-sm text-gray-600">{aplicados.length ? aplicados.join(' · ') : 'Sin filtros — se envía a todos los simpatizantes.'}</p>
        </div>
      </div>
      {redactar}
    </div>}

    {tab === 'individual' && <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-800"><UserRound className="h-4 w-4 text-blue-600" /> Destinatarios</p>
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar simpatizante por nombre, cédula o teléfono…" className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div>
        {resultados.length > 0 && <ul className="mt-1 divide-y divide-gray-100 rounded-lg border border-gray-200">{resultados.map((p) => (
          <li key={p.id}><button type="button" onClick={() => { setElegidos((x) => [...x, p]); setBusqueda('') }} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-blue-50"><span className="font-medium text-gray-800">{p.nombres} {p.apellidos}</span><span className={`text-xs ${celularValido(p.telefono) ? 'text-gray-500' : 'text-red-600'}`}>{p.telefono || 'sin teléfono'}</span></button></li>
        ))}</ul>}
        {elegidos.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{elegidos.map((p) => (
          <span key={p.id} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${celularValido(p.telefono) ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`} title={celularValido(p.telefono) ? p.telefono ?? '' : 'Sin celular válido: se omitirá'}>{p.nombres} {p.apellidos}<button onClick={() => setElegidos((x) => x.filter((e) => e.id !== p.id))}><X className="h-3 w-3" /></button></span>
        ))}</div>}
        <label className="mt-4 block text-xs font-medium text-gray-600">O escribe un número de celular
          <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ej: 3225874350" className={`${selCls} ${numero && !numeroValido ? 'border-red-300' : ''}`} /></label>
        {numero && !numeroValido && <p className="mt-1 text-xs text-red-600">Número inválido: debe ser un celular colombiano de 10 dígitos que empiece por 3.</p>}
      </div>
      {redactar}
    </div>}

    {tab === 'historial' && <div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr>{['Fecha', 'Canal', 'Destinatarios', 'Mensaje', 'Enviados', 'Fallidos', 'Omitidos', 'Enviado por'].map((h) => <th key={h} className="whitespace-nowrap px-4 py-2.5 font-semibold">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-gray-100">
        {historial.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">{cargandoHist ? 'Cargando historial…' : 'Aún no hay envíos registrados.'}</td></tr>}
        {historial.map((h) => <tr key={h.id ?? h.creadoEn} onClick={() => setDetalle(h)} className="cursor-pointer hover:bg-gray-50">
          <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">{new Date(h.creadoEn).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
          <td className="px-4 py-2.5"><span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{h.canal}</span></td>
          <td className="max-w-[200px] truncate px-4 py-2.5 text-gray-600" title={h.segmento ?? ''}>{h.segmento ?? '—'}</td>
          <td className="max-w-xs truncate px-4 py-2.5 text-gray-600" title={h.mensaje}>{h.mensaje}</td>
          <td className="px-4 py-2.5 font-semibold text-emerald-700">{h.enviados}</td>
          <td className="px-4 py-2.5 font-semibold text-red-600">{h.fallidos || '—'}</td>
          <td className="px-4 py-2.5 text-gray-500">{h.omitidos || '—'}</td>
          <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{h.autor ?? '—'}</td>
        </tr>)}
      </tbody>
    </table></div></div>}

    <Modal open={!!detalle} onClose={() => setDetalle(null)} title="Detalle del envío" subtitle={detalle ? `${detalle.enviados} enviados · ${detalle.fallidos} fallidos · ${detalle.omitidos} omitidos` : ''} wide>
      {detalle && <>
        <p className="mb-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{detalle.mensaje}</p>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500"><tr>{['Destinatario', 'Número', 'Estado', 'Detalle'].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">{detalle.detalle.map((d, i) => (
            <tr key={i}><td className="px-3 py-2 text-gray-800">{d.nombre ?? 'Número directo'}</td><td className="px-3 py-2 text-gray-600">{d.numero ?? '—'}</td>
              <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.estado === 'enviado' ? 'bg-emerald-50 text-emerald-700' : d.estado === 'fallido' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{d.estado}</span></td>
              <td className="px-3 py-2 text-xs text-gray-500">{d.error ?? ''}</td></tr>
          ))}</tbody>
        </table></div>
      </>}
    </Modal>
  </div></main>
}
