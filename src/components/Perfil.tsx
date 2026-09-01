import { ArrowLeft, Cake, MapPin, Pencil, ShieldCheck, Wallet } from 'lucide-react'
import { useApp } from '../store'
import {
  balanceDe,
  buscarPuesto,
  capacidadDisponibleDe,
  gestionesDe,
  getPersona,
  nombreLider,
  validezDe,
  vehiculosDisponibles,
} from '../data'
import { diasParaCumple, edad, fmtCOP, fmtFecha, fmtFechaHora } from '../lib'
import { Badge, Card, estadoTone, nivelTone, vehiculoTone } from './ui'

const VALIDEZ_BADGE: Record<string, { label: string; cls: string }> = {
  valido: { label: '✅ Elector válido (Valledupar)', cls: 'bg-emerald-100 text-emerald-700' },
  fuera_municipio: { label: '🟠 Fuera de municipio', cls: 'bg-amber-100 text-amber-700' },
  fuera_departamento: { label: '🔴 Fuera de departamento', cls: 'bg-red-100 text-red-700' },
}

export default function Perfil() {
  const { db, perfilId, volver, openPersona, openGestion, toggleHabeas, session, registrarVoto } = useApp()
  const p = perfilId ? getPersona(db, perfilId) : undefined

  if (!p) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p>No se encontró la ficha.</p>
        <button onClick={volver} className="text-blue-600 hover:underline mt-2">
          Volver
        </button>
      </div>
    )
  }

  const gs = gestionesDe(db, p.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
  const balance = balanceDe(db, p.id)
  const puesto = buscarPuesto(p.puesto)
  const cum = diasParaCumple(p.fechaNacimiento)
  const puedeEditar = session?.rol === 'admin' || session?.rol === 'padrino'
  const vb = VALIDEZ_BADGE[validezDe(p)]
  const disp = vehiculosDisponibles(p)

  return (
    <div>
      <button onClick={volver} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Cabecera */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-extrabold">
                  {p.nombres[0]}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
                    {p.nombres} {p.apellidos}
                    {p.esLider && <Badge className="bg-blue-100 text-blue-700">Líder · Digitador</Badge>}
                  </h2>
                  <div className="text-sm text-slate-500">
                    CC {p.cedula} · {edad(p.fechaNacimiento)} años · {p.ocupacion}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge className={vb.cls}>{vb.label}</Badge>
                    <Badge className={nivelTone(p.nivelVoto)}>{p.nivelVoto}</Badge>
                    <Badge className="bg-slate-100 text-slate-700">
                      {p.vehiculos.length === 0
                        ? 'Sin vehículo'
                        : `${p.vehiculos.length} vehículo${p.vehiculos.length > 1 ? 's' : ''} · ${disp.length} a disposición`}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700">{p.rolDiaE}</Badge>
                    <Badge className={p.votoRegistrado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}>
                      {p.votoRegistrado ? `✅ Votó · ${p.votoHora}` : '⏳ Sin voto'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {puedeEditar && (
                  <button
                    onClick={() => openPersona({ mode: 'edit', personaId: p.id })}
                    className="inline-flex items-center gap-1.5 text-xs bg-blue-600 text-white rounded-lg px-3 py-2 font-semibold hover:bg-blue-700"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                )}
                {!p.votoRegistrado && (session?.rol === 'admin' || session?.rol === 'padrino') && (
                  <button
                    onClick={() => registrarVoto(p.id)}
                    className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 text-white rounded-lg px-3 py-2 font-semibold hover:bg-emerald-700"
                  >
                    ✅ Registrar voto
                  </button>
                )}
              </div>
            </div>
            {cum <= 7 && (
              <div className="mt-3 bg-pink-50 border border-pink-200 rounded-lg px-3 py-2 text-sm text-pink-700 flex items-center gap-2">
                <Cake className="w-4 h-4" />
                Cumpleaños {cum === 0 ? 'hoy' : cum === 1 ? 'mañana' : `en ${cum} días`} — {fmtFecha(p.fechaNacimiento)} ({edad(p.fechaNacimiento)} años)
              </div>
            )}
          </Card>

          {/* Ubicación electoral */}
          <Card title="🗺️ Ubicación Electoral">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
              <Ficha label="Departamento" value={p.departamento} />
              <Ficha label="Municipio" value={p.municipio} />
              <Ficha label="Zona" value={p.zona} />
              <Ficha label="Comuna" value={p.comuna ?? '—'} />
              <Ficha label="Corregimiento" value={p.corregimiento ?? '—'} />
              <Ficha label="Barrio" value={p.barrio} />
              <Ficha label="Puesto" value={puesto ? `${puesto.id} · ${puesto.nombre}` : p.puesto} />
              <Ficha label="Mesa" value={String(p.mesa)} />
            </div>
          </Card>

          {/* 1 Datos personales */}
          <Card title="1 · Datos personales">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
              <Ficha label="Teléfono" value={p.telefono} />
              <Ficha label="WhatsApp" value={p.telefono} />
              <Ficha label="Correo" value={p.correo} />
              <Ficha label="F. nacimiento" value={fmtFecha(p.fechaNacimiento)} />
              <Ficha label="Dirección" value={p.direccion} />
            </div>
          </Card>

          {/* 2 Caracterización social */}
          <Card title="2 · Caracterización social">
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <Ficha label="Ocupación (actual)" value={p.ocupacion} />
                <Ficha label="Profesión" value={p.profesion} />
                <Ficha label="Nivel académico" value={p.nivelAcademico} />
                <Ficha label="Posgrado" value={p.posgrado} />
              </div>
              <div>
                <span className="text-slate-500 text-xs">Intereses:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.intereses.map((i) => (
                    <Badge key={i} className="bg-blue-50 text-blue-700">
                      {i}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Grupos sociales:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.gruposSociales.length === 0 && <span className="text-sm text-slate-400">—</span>}
                  {p.gruposSociales.map((g) => (
                    <Badge key={g} className="bg-purple-50 text-purple-700">
                      {g}
                    </Badge>
                  ))}
                </div>
              </div>
              <Ficha label="Observación" value={p.observacion} />
            </div>
          </Card>

          {/* 3 Logística — Vehículos */}
          <Card title="3 · Logística Día E — Vehículos">
            {p.vehiculos.length === 0 ? (
              <p className="text-sm text-slate-400">Sin vehículos registrados.</p>
            ) : (
              <div className="space-y-2">
                {p.vehiculos.map((v, i) => (
                  <div key={i} className="flex items-center justify-between border border-slate-200 rounded-lg p-2.5">
                    <div className="flex items-center gap-2">
                      <Badge className={vehiculoTone(v.tipo)}>{v.tipo}</Badge>
                      <span className="text-sm text-slate-600">{v.capacidadPasajeros} pasajeros</span>
                    </div>
                    <Badge className={v.aDisposicion ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}>
                      {v.aDisposicion ? 'A disposición' : 'No disponible'}
                    </Badge>
                  </div>
                ))}
                <div className="text-xs text-slate-500 pt-1">
                  Capacidad total a disposición: <b>{capacidadDisponibleDe(p)} pax</b>
                </div>
              </div>
            )}
          </Card>

          {/* 4 Vinculación */}
          <Card title="4 · Vinculación y compromiso">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
              <Ficha label="Líder asignado" value={nombreLider(p.liderId)} />
              <Ficha label="Planilla" value={p.planillaCodigo ?? 'Directa (sin planilla)'} />
              <Ficha label="Nivel de voto" value={p.nivelVoto} />
              <Ficha label="Rol Día E" value={p.rolDiaE} />
            </div>
          </Card>

          {/* 5 Legal */}
          <Card title="5 · Legal — Habeas Data">
            <div className="flex items-center justify-between gap-3">
              <span className={`text-sm inline-flex items-center gap-2 ${p.habeasData ? 'text-emerald-700' : 'text-red-600'}`}>
                <ShieldCheck className="w-4 h-4" />
                {p.habeasData ? 'Autorización Habeas Data activa' : 'Sin autorización Habeas Data'}
              </span>
              {puedeEditar && (
                <button onClick={() => toggleHabeas(p.id)} className="text-xs bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-2 font-medium">
                  Cambiar estado
                </button>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Registrado: {fmtFechaHora(p.habeasDataFecha)}
            </div>
          </Card>
        </div>

        {/* Gestiones */}
        <Card
          title="🤝 Gestiones y compromisos"
          action={
            <button
              onClick={() => openGestion({ mode: 'new', personaId: p.id })}
              className="text-xs bg-blue-600 text-white rounded-lg px-3 py-2 font-semibold hover:bg-blue-700"
            >
              + Agregar
            </button>
          }
        >
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-center">
            <div className="text-[11px] text-amber-700 font-medium">Total invertido / gestionado</div>
            <div className="text-2xl font-extrabold text-amber-700 inline-flex items-center gap-1">
              <Wallet className="w-5 h-5" /> {fmtCOP(balance)}
            </div>
          </div>
          <div className="space-y-2">
            {gs.length === 0 && <p className="text-sm text-slate-400">Sin gestiones registradas.</p>}
            {gs.map((g) => (
              <div key={g.id} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-slate-100 text-slate-700">{g.categoria}</Badge>
                  <Badge className={estadoTone(g.estado)}>{g.estado}</Badge>
                </div>
                <p className="text-sm text-slate-700 mt-1.5">{g.descripcion}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span>
                    {fmtFecha(g.fecha)} · {g.responsable}
                  </span>
                  <span className={`font-bold ${g.monto > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                    {g.monto > 0 ? fmtCOP(g.monto) : '—'}
                  </span>
                </div>
                <button onClick={() => openGestion({ mode: 'edit', gestionId: g.id })} className="mt-1.5 text-[11px] text-blue-600 hover:underline">
                  Editar
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Ficha({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</div>
      <div className="text-slate-800 font-medium break-words">{value || '—'}</div>
    </div>
  )
}
