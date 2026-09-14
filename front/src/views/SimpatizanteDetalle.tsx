import { useEffect, useState } from 'react'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useApp } from '../store'
import { buscarPuesto, DEPARTAMENTO_CAMPANA, MUNICIPIO_CAMPANA } from '../data'
import { edad, fmtFecha } from '../lib'
import type { SimpatizanteApi } from '../types'
import { Badge, Card, nivelAcademicoTone, nivelTone, validezLabel, validezTone, vehiculoTone } from '../components/ui'

const validezDeApi = (p: SimpatizanteApi) => {
  if (p.departamento === DEPARTAMENTO_CAMPANA && p.municipio === MUNICIPIO_CAMPANA) return 'valido' as const
  if (p.departamento === DEPARTAMENTO_CAMPANA) return 'fuera_municipio' as const
  return 'fuera_departamento' as const
}

export default function SimpatizanteDetalle() {
  const { simpatizanteDetalleId, navigate, openPersona, eliminarSimpatizante, lideresApi, cargarSimpatizanteDetalle, session } = useApp()
  const [p, setP] = useState<SimpatizanteApi | null>(null)
  const [cargando, setCargando] = useState(true)
  const [borrando, setBorrando] = useState(false)

  useEffect(() => {
    if (!simpatizanteDetalleId) return
    setCargando(true)
    void cargarSimpatizanteDetalle(simpatizanteDetalleId).then((res) => {
      setP(res)
      setCargando(false)
    })
  }, [simpatizanteDetalleId, cargarSimpatizanteDetalle])

  const puedeEditar = session?.rol === 'admin' || session?.rol === 'padrino'
  const puesto = p ? buscarPuesto(p.puesto) : undefined
  const lider = p ? lideresApi.find((l) => l.id === p.liderId) : undefined

  const eliminar = async () => {
    if (!p) return
    if (!window.confirm(`¿Eliminar la ficha de ${p.nombres} ${p.apellidos}? Esta acción no se puede deshacer.`)) return
    setBorrando(true)
    await eliminarSimpatizante(p.id)
    setBorrando(false)
  }

  return (
    <div>
      <button onClick={() => navigate('directorio')} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3">
        <ArrowLeft className="w-4 h-4" /> Volver al directorio
      </button>

      {cargando && <p className="text-sm text-slate-400 py-10 text-center">Cargando ficha…</p>}

      {!cargando && !p && (
        <div className="text-center py-20 text-slate-500">
          <p>No se encontró la ficha (o no tienes permiso para verla).</p>
        </div>
      )}

      {!cargando && p && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-extrabold">
                    {p.nombres[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {p.nombres} {p.apellidos}
                    </h2>
                    <div className="text-sm text-slate-500">
                      CC {p.cedula} · {edad(p.fechaNacimiento)} años · {p.ocupacion || 'Sin ocupación registrada'}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge className={validezTone(validezDeApi(p))}>{validezLabel(validezDeApi(p))}</Badge>
                      <Badge className={nivelTone(p.nivelVoto)}>{p.nivelVoto}</Badge>
                      <Badge className="bg-slate-100 text-slate-700">{p.rolDiaE}</Badge>
                      <Badge className={p.habeasData ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}>
                        {p.habeasData ? '✅ Habeas Data autorizado' : '⏳ Sin autorización'}
                      </Badge>
                    </div>
                  </div>
                </div>
                {puedeEditar && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => openPersona({ mode: 'edit', personaId: p.id })}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      <Pencil className="w-4 h-4" /> Editar
                    </button>
                    <button
                      onClick={() => void eliminar()}
                      disabled={borrando}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" /> {borrando ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Ubicación electoral">
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div><dt className="text-slate-400 text-xs">Departamento</dt><dd className="text-slate-800">{p.departamento}</dd></div>
                <div><dt className="text-slate-400 text-xs">Municipio</dt><dd className="text-slate-800">{p.municipio}</dd></div>
                <div><dt className="text-slate-400 text-xs">Zona</dt><dd className="text-slate-800">{p.zona}</dd></div>
                <div>
                  <dt className="text-slate-400 text-xs">{p.zona === 'Urbana' ? 'Comuna' : 'Corregimiento'}</dt>
                  <dd className="text-slate-800">{(p.zona === 'Urbana' ? p.comuna : p.corregimiento) || '—'}</dd>
                </div>
                <div><dt className="text-slate-400 text-xs">Barrio</dt><dd className="text-slate-800">{p.barrio}</dd></div>
                <div><dt className="text-slate-400 text-xs">Puesto de votación</dt><dd className="text-slate-800">{puesto?.nombre ?? p.puesto}</dd></div>
                <div><dt className="text-slate-400 text-xs">Mesa</dt><dd className="text-slate-800">{p.mesa}</dd></div>
              </dl>
            </Card>

            <Card title="Datos personales">
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div><dt className="text-slate-400 text-xs">Fecha de nacimiento</dt><dd className="text-slate-800">{fmtFecha(p.fechaNacimiento)}</dd></div>
                <div><dt className="text-slate-400 text-xs">Teléfono / WhatsApp</dt><dd className="text-slate-800">{p.telefono}</dd></div>
                <div><dt className="text-slate-400 text-xs">Correo</dt><dd className="text-slate-800">{p.correo || '—'}</dd></div>
                <div className="col-span-2 sm:col-span-3"><dt className="text-slate-400 text-xs">Dirección residencial</dt><dd className="text-slate-800">{p.direccion || '—'}</dd></div>
              </dl>
            </Card>

            <Card title="Caracterización social">
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-3">
                <div><dt className="text-slate-400 text-xs">Ocupación</dt><dd className="text-slate-800">{p.ocupacion || '—'}</dd></div>
                <div><dt className="text-slate-400 text-xs">Profesión</dt><dd className="text-slate-800">{p.profesion || 'Sin profesión'}</dd></div>
                <div>
                  <dt className="text-slate-400 text-xs">Nivel académico</dt>
                  <dd><Badge className={nivelAcademicoTone(p.nivelAcademico)}>{p.nivelAcademico}</Badge></dd>
                </div>
                {p.posgrado !== 'Ninguno' && (
                  <div><dt className="text-slate-400 text-xs">Posgrado</dt><dd><Badge className="bg-purple-100 text-purple-700">{p.posgrado}</Badge></dd></div>
                )}
              </dl>
              {p.intereses.length > 0 && (
                <div className="mb-2">
                  <div className="text-slate-400 text-xs mb-1">Gustos e intereses</div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.intereses.map((i) => <Badge key={i} className="bg-blue-50 text-blue-700">{i}</Badge>)}
                  </div>
                </div>
              )}
              {p.gruposSociales.length > 0 && (
                <div className="mb-2">
                  <div className="text-slate-400 text-xs mb-1">Grupos sociales</div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.gruposSociales.map((g) => <Badge key={g} className="bg-purple-50 text-purple-700">{g}</Badge>)}
                  </div>
                </div>
              )}
              {p.observacion && (
                <div>
                  <div className="text-slate-400 text-xs mb-1">Observación</div>
                  <p className="text-sm text-slate-700">{p.observacion}</p>
                </div>
              )}
            </Card>

            {p.vehiculos.length > 0 && (
              <Card title="Vehículos (Logística Día E)">
                <div className="flex flex-wrap gap-2">
                  {p.vehiculos.map((v, i) => (
                    <Badge key={i} className={vehiculoTone(v.tipo)}>
                      {v.tipo} · {v.capacidadPasajeros} pax {v.aDisposicion ? '· a disposición' : ''} · {v.estado}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card title="Vinculación y compromiso">
              <dl className="space-y-3 text-sm">
                <div><dt className="text-slate-400 text-xs">Líder asignado</dt><dd className="text-slate-800">{lider ? `${lider.nombres} ${lider.apellidos}` : '—'}</dd></div>
                <div><dt className="text-slate-400 text-xs">Nivel de voto</dt><dd><Badge className={nivelTone(p.nivelVoto)}>{p.nivelVoto}</Badge></dd></div>
                <div><dt className="text-slate-400 text-xs">Rol asignado Día E</dt><dd className="text-slate-800">{p.rolDiaE}</dd></div>
              </dl>
            </Card>
            <Card title="Registro">
              <dl className="space-y-3 text-sm">
                <div><dt className="text-slate-400 text-xs">Creado</dt><dd className="text-slate-800">{fmtFecha(p.creadoEn)}</dd></div>
                <div><dt className="text-slate-400 text-xs">Última actualización</dt><dd className="text-slate-800">{fmtFecha(p.actualizadoEn)}</dd></div>
                <div><dt className="text-slate-400 text-xs">Habeas Data autorizado</dt><dd className="text-slate-800">{p.habeasDataFecha ? fmtFecha(p.habeasDataFecha) : '—'}</dd></div>
              </dl>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
