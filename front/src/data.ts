import type {
  ActividadDiaE,
  CensoEntry,
  CategoriaGestion,
  DB,
  EstadoVehiculo,
  FiltrosEnvio,
  Gestion,
  LiderInfo,
  NivelAcademico,
  PadrinoInfo,
  Permiso,
  Persona,
  Planilla,
  Posgrado,
  Puesto,
  TipoVehiculo,
  Usuario,
  Validez,
  Vehiculo,
} from './types'
import { diasParaCumple, hoyISO, mulberry32, pad } from './lib'

export const DEPARTAMENTO_CAMPANA = 'Cesar'
export const MUNICIPIO_CAMPANA = 'Valledupar'
export const LS_KEY = 'crmElectoralReact_v11'

/* ---------- División político-administrativa ---------- */

const PUESTOS_RAW: Omit<Puesto, 'mesaBase' | 'mesas'>[] = [
  // Valledupar — Comuna 1
  { id: 'PV01', nombre: 'I.E. Columna', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', comuna: 'Comuna 1', barrio: 'Centro' },
  { id: 'PV02', nombre: 'Colegio Nacional Loperena', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', comuna: 'Comuna 1', barrio: 'Centro' },
  { id: 'PV03', nombre: 'Escuela Cañaguate', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', comuna: 'Comuna 1', barrio: 'Cañaguate' },
  // Valledupar — Comuna 2
  { id: 'PV04', nombre: 'I.E. San Joaquín', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', comuna: 'Comuna 2', barrio: 'San Joaquín' },
  { id: 'PV05', nombre: 'Escuela Los Cortijos', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', comuna: 'Comuna 2', barrio: 'Los Cortijos' },
  { id: 'PV06', nombre: 'Coliseo Julio Monsalvo', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', comuna: 'Comuna 2', barrio: 'Nueve de Octubre' },
  // Valledupar — Comuna 3
  { id: 'PV07', nombre: 'I.E. La Nevada', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', comuna: 'Comuna 3', barrio: 'La Nevada' },
  { id: 'PV08', nombre: 'Escuela El Carmen', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', comuna: 'Comuna 3', barrio: 'El Carmen' },
  // Valledupar — Comuna 4
  { id: 'PV09', nombre: 'I.E. Doce de Octubre', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', comuna: 'Comuna 4', barrio: 'Doce de Octubre' },
  { id: 'PV10', nombre: 'Escuela Mayales', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', comuna: 'Comuna 4', barrio: 'Mayales' },
  { id: 'PV11', nombre: 'Casa de la Cultura Mayales', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', comuna: 'Comuna 4', barrio: 'Mayales' },
  // Valledupar — Comuna 5
  { id: 'PV12', nombre: 'I.E. Villa Castro', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', comuna: 'Comuna 5', barrio: 'Villa Castro' },
  { id: 'PV13', nombre: 'Escuela Garupal', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', comuna: 'Comuna 5', barrio: 'Garupal' },
  // Valledupar — Comuna 6
  { id: 'PV14', nombre: 'I.E. Primero de Mayo', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', comuna: 'Comuna 6', barrio: 'Primero de Mayo' },
  { id: 'PV15', nombre: 'Polideportivo La Esperanza', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', comuna: 'Comuna 6', barrio: 'La Esperanza' },
  // Valledupar — Corregimientos (rural)
  { id: 'PV16', nombre: 'Escuela Patillal', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Rural', corregimiento: 'Patillal', barrio: 'Patillal Centro' },
  { id: 'PV17', nombre: 'Escuela La Mina', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Rural', corregimiento: 'La Mina', barrio: 'La Mina Centro' },
  { id: 'PV18', nombre: 'I.E. Los Venados', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Rural', corregimiento: 'Los Venados', barrio: 'Los Venados Centro' },
  { id: 'PV19', nombre: 'Escuela Guacoche', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Rural', corregimiento: 'Guacoche', barrio: 'Guacoche Centro' },
  { id: 'PV20', nombre: 'I.E. Valencia de Jesús', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Rural', corregimiento: 'Valencia de Jesús', barrio: 'Valencia Centro' },
  { id: 'PV21', nombre: 'Escuela Aguas Blancas', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Rural', corregimiento: 'Aguas Blancas', barrio: 'Aguas Blancas Centro' },
  // Otros municipios del Cesar (fuera del electorado de Valledupar)
  { id: 'PV22', nombre: 'I.E. Aguachica', departamento: 'Cesar', municipio: 'Aguachica', zona: 'Urbana', comuna: 'Comuna 1', barrio: 'Villa del Rosario' },
  { id: 'PV23', nombre: 'Colegio Agustín Codazzi', departamento: 'Cesar', municipio: 'Agustín Codazzi', zona: 'Urbana', comuna: 'Comuna 1', barrio: 'Las Flores' },
  { id: 'PV24', nombre: 'Escuela La Paz', departamento: 'Cesar', municipio: 'La Paz', zona: 'Urbana', comuna: 'Comuna 1', barrio: 'Bellavista' },
  // Otros departamentos (fuera del Cesar)
  { id: 'PV25', nombre: 'I.E. Riohacha', departamento: 'La Guajira', municipio: 'Riohacha', zona: 'Urbana', comuna: 'Comuna 1', barrio: 'Cojoro' },
  { id: 'PV26', nombre: 'Colegio Santa Marta', departamento: 'Magdalena', municipio: 'Santa Marta', zona: 'Urbana', comuna: 'Comuna 1', barrio: 'Bastidas' },
  { id: 'PV27', nombre: 'Escuela Barranquilla', departamento: 'Atlántico', municipio: 'Barranquilla', zona: 'Urbana', comuna: 'Comuna 1', barrio: 'San Roque' },
]

export const PUESTOS: Puesto[] = PUESTOS_RAW.map((p, i) => ({
  ...p,
  mesaBase: 101 + i * 100,
  mesas: p.zona === 'Rural' ? 4 : 6,
}))

export const DEPARTAMENTOS: string[] = [...new Set(PUESTOS.map((p) => p.departamento))]
export const MUNICIPIOS: string[] = [...new Set(PUESTOS.map((p) => p.municipio))]
export const COMUNAS: string[] = [
  ...new Set(PUESTOS.filter((p) => p.zona === 'Urbana').map((p) => p.comuna).filter((x): x is string => !!x)),
]
export const CORREGIMIENTOS: string[] = [
  ...new Set(PUESTOS.filter((p) => p.zona === 'Rural').map((p) => p.corregimiento).filter((x): x is string => !!x)),
]
export const BARRIOS: string[] = [...new Set(PUESTOS.map((p) => p.barrio))]

export const municipiosDeDepartamento = (dep: string): string[] =>
  [...new Set(PUESTOS.filter((p) => p.departamento === dep).map((p) => p.municipio))]

export const comunasDeMunicipio = (mun: string): string[] =>
  [...new Set(PUESTOS.filter((p) => p.municipio === mun && p.zona === 'Urbana').map((p) => p.comuna).filter((x): x is string => !!x))]

export const corregimientosDeMunicipio = (mun: string): string[] =>
  [...new Set(PUESTOS.filter((p) => p.municipio === mun && p.zona === 'Rural').map((p) => p.corregimiento).filter((x): x is string => !!x))]

export const barriosDeFiltro = (mun: string, comuna: string, corregimiento: string): string[] => {
  let ps = PUESTOS.filter((p) => p.municipio === mun)
  if (comuna && comuna !== 'all') ps = ps.filter((p) => p.comuna === comuna)
  if (corregimiento && corregimiento !== 'all') ps = ps.filter((p) => p.corregimiento === corregimiento)
  return [...new Set(ps.map((p) => p.barrio))]
}

export const puestosDeBarrio = (mun: string, barrio: string): Puesto[] =>
  PUESTOS.filter((p) => p.municipio === mun && p.barrio === barrio)

/* ---------- Líderes y usuarios ---------- */

export const LIDERES_INFO: LiderInfo[] = [
  { id: 'L1', userId: 'lider1', nombres: 'Andrés', apellidos: 'Ramírez Muñoz', cedula: '1111000001', meta: 70, territorio: 'Comunas 1–2 · Valledupar', puestos: ['PV01', 'PV02', 'PV03', 'PV04', 'PV05', 'PV06'], errorRate: 0.06, rolDiaE: 'Testigo electoral', vehiculos: [{ tipo: 'Automóvil', capacidadPasajeros: 4, aDisposicion: true, estado: 'En ruta' }], padrinoId: 'P1' },
  { id: 'L2', userId: 'lider2', nombres: 'María Fernanda', apellidos: 'Gómez Ríos', cedula: '1111000002', meta: 70, territorio: 'Comunas 3–4 · Valledupar', puestos: ['PV07', 'PV08', 'PV09', 'PV10', 'PV11'], errorRate: 0.08, rolDiaE: 'Votante', vehiculos: [], padrinoId: 'P1' },
  { id: 'L3', userId: 'lider3', nombres: 'Carlos Alberto', apellidos: 'Torres Mejía', cedula: '1111000003', meta: 65, territorio: 'Comunas 5–6 · Valledupar', puestos: ['PV12', 'PV13', 'PV14', 'PV15'], errorRate: 0.14, rolDiaE: 'Conductor', vehiculos: [{ tipo: 'Camioneta', capacidadPasajeros: 12, aDisposicion: true, estado: 'En ruta' }], padrinoId: 'P2' },
  { id: 'L4', userId: 'lider4', nombres: 'Diana Marcela', apellidos: 'Rojas Díaz', cedula: '1111000004', meta: 50, territorio: 'Corregimientos Norte (Patillal, La Mina, Los Venados)', puestos: ['PV16', 'PV17', 'PV18'], errorRate: 0.24, rolDiaE: 'Votante', vehiculos: [{ tipo: 'Moto', capacidadPasajeros: 1, aDisposicion: true, estado: 'Disponible' }], padrinoId: 'P2' },
  { id: 'L5', userId: 'lider5', nombres: 'Jorge Enrique', apellidos: 'Mejía Soto', cedula: '1111000005', meta: 50, territorio: 'Corregimientos Sur (Guacoche, Valencia de Jesús, Aguas Blancas)', puestos: ['PV19', 'PV20', 'PV21'], errorRate: 0.24, rolDiaE: 'Conductor', vehiculos: [{ tipo: 'Camioneta', capacidadPasajeros: 10, aDisposicion: true, estado: 'Completado' }], padrinoId: 'P3' },
  { id: 'L6', userId: 'lider6', nombres: 'Patricia', apellidos: 'Salas Orozco', cedula: '1111000006', meta: 40, territorio: 'Zona mixta · control débil', puestos: ['PV02', 'PV09', 'PV14'], errorRate: 0.55, rolDiaE: 'Votante', vehiculos: [{ tipo: 'Moto', capacidadPasajeros: 1, aDisposicion: true, estado: 'Disponible' }], padrinoId: 'P3' },
  { id: 'L0', userId: 'candidato', nombres: 'Candidato', apellidos: 'Entorno', cedula: '1111000000', meta: 30, territorio: 'Entorno del candidato (amigos y familiares)', puestos: ['PV01', 'PV03', 'PV05', 'PV07', 'PV09'], errorRate: 0, rolDiaE: 'Votante', vehiculos: [], padrinoId: 'P1' },
]

export const PADRINOS_INFO = [
  { id: 'P1', userId: 'padrino1', nombres: 'Luisa', apellidos: 'Castro Peña', cedula: '1111001001', sector: 'Comunas 1–4', personaId: 'P1' },
  { id: 'P2', userId: 'padrino2', nombres: 'Miguel', apellidos: 'Vargas Ortiz', cedula: '1111001002', sector: 'Comunas 5–6 · Corregimientos Norte', personaId: 'P2' },
  { id: 'P3', userId: 'padrino3', nombres: 'Carolina', apellidos: 'Jiménez Ríos', cedula: '1111001003', sector: 'Corregimientos Sur · Zona mixta', personaId: undefined },
]

export const USUARIOS: Usuario[] = [
  { id: 'admin', nombre: 'Director de Campaña', email: 'admin@campana.com', pass: 'admin123', rol: 'admin' },
  { id: 'subadmin1', nombre: 'Coordinador de Conectividad', email: 'conectividad@campana.com', pass: 'subadmin123', rol: 'subadmin', permisos: ['conectividad'] },
  ...PADRINOS_INFO.map((p) => ({
    id: p.userId,
    nombre: `${p.nombres} ${p.apellidos}`,
    email: `${p.userId}@campana.com`,
    pass: 'padrino123',
    rol: 'padrino' as const,
    padrinoId: p.id,
  })),
]

export function can(u: Usuario | null | undefined, permiso: Permiso): boolean {
  if (!u) return false
  if (u.rol === 'admin') return true
  return !!u.permisos?.includes(permiso)
}

export const CATEGORIAS: CategoriaGestion[] = [
  'Salud', 'Empleo', 'Ayudas/Mercados', 'Recursos/Dinero', 'Trámites/Asesoría', 'Obras comunitarias',
]

export const INTERESES = [
  'Deporte', 'Animales', 'Empleo', 'Infraestructura', 'Educación', 'Salud',
  'Cultura', 'Medio Ambiente', 'Vivienda', 'Emprendimiento', 'Tercera Edad', 'Juventud',
]

export const GRUPOS_SOCIALES = [
  'LGBTQ+', 'Negritudes', 'Indígenas', 'Discapacitados', 'Seguridad',
  'Mujeres', 'Jóvenes', 'Adulto mayor', 'Víctimas del conflicto',
  'Campesinos', 'Religiosos', 'Migrantes',
]

export const OCUPACIONES = [
  'Comerciante', 'Independiente', 'Empleado', 'Ama de casa', 'Estudiante', 'Profesional',
  'Transportador', 'Agricultor', 'Constructor', 'Docente', 'Enfermero(a)', 'Vendedor(a)',
  'Desempleado', 'Pensionado', 'Otro',
]

export const PROFESIONES = [
  'Abogado/a', 'Ingeniero/a', 'Médico/a', 'Contador/a', 'Enfermero/a', 'Docente',
  'Administrador/a', 'Economista', 'Arquitecto/a', 'Psicólogo/a', 'Comunicador/a',
  'Odontólogo/a', 'Trabajador/a Social', 'Veterinario/a', 'Diseñador/a',
]

export const NIVELES_ACADEMICOS: NivelAcademico[] = ['Sin estudios', 'Primaria', 'Bachiller', 'Técnico', 'Tecnólogo', 'Profesional']

export const POSGRADOS: Posgrado[] = ['Ninguno', 'Especialización', 'Maestría', 'Doctorado']

const NOMBRES = [
  'Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Sofía', 'Andrés', 'Valentina', 'Jorge', 'Camila',
  'Pedro', 'Daniela', 'Miguel', 'Isabella', 'Fernando', 'Laura', 'Diego', 'Natalia', 'Santiago',
  'Gabriela', 'Ricardo', 'Mariana', 'Alejandro', 'Paula', 'Héctor', 'Diana', 'Oscar', 'Carolina',
  'Cristian', 'Luisa', 'Manuel', 'Adriana', 'Gustavo', 'Catalina', 'Iván', 'Marcela', 'Julián',
  'Verónica', 'Felipe', 'Tatiana', 'Raúl', 'Yolanda', 'Mauricio', 'Gloria', 'Esteban', 'Rosa',
  'Wilson', 'Patricia', 'Álvaro', 'Sandra',
]

const APELLIDOS = [
  'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Torres',
  'Flores', 'Rojas', 'Díaz', 'Vargas', 'Castro', 'Mendoza', 'Morales', 'Ortiz', 'Herrera', 'Medina',
  'Aguilar', 'Suárez', 'Jiménez', 'Gutiérrez', 'Silva', 'Romero', 'Álvarez', 'Moreno', 'Navarro',
  'Campos', 'Peña',
]

/* ---------- Helpers ---------- */

export function buscarPuesto(id: string): Puesto | undefined {
  return PUESTOS.find((p) => p.id === id)
}

export function nombreLider(lid?: string): string {
  const l = LIDERES_INFO.find((x) => x.id === lid)
  return l ? `${l.nombres} ${l.apellidos}` : '—'
}

export function nombrePadrino(db: DB, pid?: string): string {
  const p = db.padrinos.find((x) => x.id === pid)
  return p ? p.nombre : '—'
}

export function lideresDePadrino(db: DB, pid: string): LiderInfo[] {
  return LIDERES_INFO.filter((l) => (db.padrinoLider[l.id] ?? '') === pid)
}

export function camposFaltantes(p: { telefono: string; correo: string; direccion: string; barrio: string }): string[] {
  const faltan: string[] = []
  if (!p.telefono) faltan.push('teléfono')
  if (!p.correo) faltan.push('correo')
  if (!p.direccion) faltan.push('dirección')
  if (!p.barrio) faltan.push('barrio')
  return faltan
}

export function territorioDeLider(lid: string): string {
  const l = LIDERES_INFO.find((x) => x.id === lid)
  return l ? l.territorio : '—'
}

export const getPersona = (db: DB, id?: string): Persona | undefined =>
  id ? db.personas.find((p) => p.id === id) : undefined

export const gestionesDe = (db: DB, pid: string): Gestion[] =>
  db.gestiones.filter((g) => g.personaId === pid)

export const balanceDe = (db: DB, pid: string): number =>
  gestionesDe(db, pid).reduce((s, g) => s + (Number(g.monto) || 0), 0)

export function validezDe(p: Persona): Validez {
  if (p.departamento === DEPARTAMENTO_CAMPANA && p.municipio === MUNICIPIO_CAMPANA) return 'valido'
  if (p.departamento === DEPARTAMENTO_CAMPANA) return 'fuera_municipio'
  return 'fuera_departamento'
}

export const esValido = (p: Persona): boolean => validezDe(p) === 'valido'

export const vehiculosDisponibles = (p: Persona): Vehiculo[] =>
  p.vehiculos.filter((v) => v.aDisposicion)

export const capacidadDisponibleDe = (p: Persona): number =>
  vehiculosDisponibles(p).reduce((s, v) => s + (Number(v.capacidadPasajeros) || 0), 0)

export const firmesDe = (db: DB, lid: string): number =>
  db.personas.filter((p) => p.liderId === lid && p.nivelVoto === 'Firme').length

export const firmesValidosDe = (db: DB, lid: string): number =>
  db.personas.filter((p) => p.liderId === lid && p.nivelVoto === 'Firme' && esValido(p)).length

export const invalidosDe = (db: DB, lid: string): number =>
  db.personas.filter((p) => p.liderId === lid && !esValido(p)).length

export const totalDe = (db: DB, lid: string): number =>
  db.personas.filter((p) => p.liderId === lid).length

export const gestionesDeLider = (db: DB, lid: string): number =>
  db.gestiones.filter((g) => {
    const p = getPersona(db, g.personaId)
    return !!p && p.liderId === lid
  }).length

export function cumpleanerosSemana(db: DB): { p: Persona; dias: number }[] {
  return db.personas
    .map((p) => ({ p, dias: diasParaCumple(p.fechaNacimiento) }))
    .filter((x) => x.dias >= 0 && x.dias <= 7)
    .sort((a, b) => a.dias - b.dias)
}

export function destinatariosFiltrados(db: DB, f: FiltrosEnvio): Persona[] {
  return db.personas.filter((p) => {
    if (f.liderId !== 'all' && p.liderId !== f.liderId) return false
    if (f.departamento !== 'all' && p.departamento !== f.departamento) return false
    if (f.municipio !== 'all' && p.municipio !== f.municipio) return false
    if (f.zona !== 'all' && p.zona !== f.zona) return false
    if (f.comuna !== 'all' && p.comuna !== f.comuna) return false
    if (f.corregimiento !== 'all' && p.corregimiento !== f.corregimiento) return false
    if (f.barrio !== 'all' && p.barrio !== f.barrio) return false
    if (f.puesto !== 'all' && p.puesto !== f.puesto) return false
    if (f.tieneVehiculo && !p.vehiculos.some((v) => v.aDisposicion)) return false
    if (f.interes !== 'all' && !p.intereses.includes(f.interes)) return false
    if (f.grupoSocial !== 'all' && !p.gruposSociales.includes(f.grupoSocial)) return false
    if (f.profesion !== 'all' && p.profesion !== f.profesion) return false
    if (f.nivelAcademico !== 'all' && p.nivelAcademico !== f.nivelAcademico) return false
    if (f.posgrado !== 'all' && p.posgrado !== f.posgrado) return false
    if (f.ocupacion !== 'all' && p.ocupacion !== f.ocupacion) return false
    if (f.nivelVoto !== 'all' && p.nivelVoto !== f.nivelVoto) return false
    if (f.rolDiaE !== 'all' && p.rolDiaE !== f.rolDiaE) return false
    if (f.validez === 'valido' && !esValido(p)) return false
    if (f.validez === 'invalido' && esValido(p)) return false
    if (f.validez === 'fuera_municipio' && validezDe(p) !== 'fuera_municipio') return false
    if (f.validez === 'fuera_departamento' && validezDe(p) !== 'fuera_departamento') return false
    if (f.conGestiones === 'si' && gestionesDe(db, p.id).length === 0) return false
    if (f.conGestiones === 'no' && gestionesDe(db, p.id).length > 0) return false
    if (f.categoria !== 'all' || f.estado !== 'all') {
      const match = gestionesDe(db, p.id).some(
        (g) =>
          (f.categoria === 'all' || g.categoria === f.categoria) &&
          (f.estado === 'all' || g.estado === f.estado),
      )
      if (!match) return false
    }
    if (f.cumpleanos && diasParaCumple(p.fechaNacimiento) > 7) return false
    return true
  })
}

/* ---------- Generación determinista ---------- */

const DESCS: Record<CategoriaGestion, string[]> = {
  Salud: [
    'Gestión de cita médica prioritaria en EPS',
    'Apoyo para entrega de medicamentos',
    'Trámite de remisión a especialista',
    'Acompañamiento para cirugía programada',
    'Gestión de autorización de exámenes',
  ],
  Empleo: [
    'Vinculación a vacante en obra municipal',
    'Postulación a programa de empleo',
    'Recomendación de hoja de vida',
    'Gestión de contrato temporal',
    'Vinculación a ruta de emprendimiento',
  ],
  'Ayudas/Mercados': [
    'Entrega de mercado mensual',
    'Kit de aseo e higiene',
    'Ayuda alimentaria de emergencia',
    'Entrega de útiles escolares',
    'Mercado para adulto mayor',
  ],
  'Recursos/Dinero': [
    'Apoyo económico para transporte',
    'Aporte para arriendo',
    'Microcrédito rotativo',
    'Ayuda para matrícula escolar',
    'Apoyo para emprendimiento',
  ],
  'Trámites/Asesoría': [
    'Asesoría en trámite de pensión',
    'Orientación para subsidio de vivienda',
    'Trámite de registro civil',
    'Asesoría jurídica',
    'Acompañamiento en trámite de Sisbén',
  ],
  'Obras comunitarias': [
    'Gestión de arreglo de vía',
    'Solicitud de luminarias',
    'Reparación de acueducto',
    'Construcción de salón comunal',
    'Mantenimiento de parque',
  ],
}

function generarGestiones(personas: Persona[], rng: () => number): Gestion[] {
  const g: Gestion[] = []
  const hoy = Date.now()
  const add = (
    diasAtras: number,
    cat: CategoriaGestion,
    desc: string,
    monto: number,
    estado: Gestion['estado'],
    responsable: string,
    idx: number,
  ) => {
    const p = personas[idx % personas.length]
    g.push({
      id: 'G' + String(g.length + 1).padStart(3, '0'),
      personaId: p.id,
      fecha: new Date(hoy - 86400000 * diasAtras).toISOString().slice(0, 10),
      categoria: cat,
      descripcion: desc,
      monto,
      estado,
      responsable,
      creadoEn: new Date().toISOString(),
      creadoPor: 'seed',
    })
  }
  // Casos de demostración (algunos sobre líderes: índices 0..5)
  add(1, 'Salud', 'Gestión de cita médica prioritaria en EPS y entrega de medicamentos.', 0, 'Pendiente', 'Comité de Salud', 6)
  add(3, 'Salud', 'Acompañamiento para remisión a especialista en ortopedia.', 0, 'Resuelto', 'Comité de Salud', 18)
  add(5, 'Empleo', 'Vinculación a vacante en obra pública municipal (pavimentación).', 0, 'Resuelto', 'Gestión Humana', 30)
  add(2, 'Empleo', 'Postulación a programa de primer empleo joven.', 0, 'Pendiente', 'Gestión Humana', 55)
  add(4, 'Ayudas/Mercados', 'Entrega de mercado mensual para familia de 4 personas.', 180000, 'Resuelto', 'Comité Social', 12)
  add(1, 'Ayudas/Mercados', 'Kit de aseo e higiene para adulto mayor.', 85000, 'En Proceso', 'Comité Social', 78)
  add(6, 'Recursos/Dinero', 'Apoyo económico para transporte y fotocopias de documentos.', 60000, 'Resuelto', 'Finanzas', 24)
  add(2, 'Recursos/Dinero', 'Aporte para pago de arriendo del mes.', 250000, 'Pendiente', 'Finanzas', 44)
  add(7, 'Trámites/Asesoría', 'Asesoría y acompañamiento en trámite de pensión.', 0, 'En Proceso', 'Asesoría Legal', 90)
  add(3, 'Trámites/Asesoría', 'Orientación jurídica para subsidio de vivienda.', 0, 'Resuelto', 'Asesoría Legal', 120)
  add(8, 'Obras comunitarias', 'Gestión de arreglo de vía principal del corregimiento Patillal.', 0, 'En Proceso', 'Obras Públicas', 140)
  add(2, 'Obras comunitarias', 'Solicitud de luminarias para el parque del barrio Mayales.', 0, 'Pendiente', 'Obras Públicas', 200)
  add(1, 'Salud', 'Gestión de cirugía programada para familiar del simpatizante.', 0, 'En Proceso', 'Comité de Salud', 0)
  add(4, 'Recursos/Dinero', 'Microcrédito rotativo para emprendimiento de arepas.', 400000, 'Resuelto', 'Finanzas', 2)
  add(2, 'Empleo', 'Recomendación de hoja de vida ante empresa aliada de confecciones.', 0, 'Pendiente', 'Gestión Humana', 3)
  add(3, 'Ayudas/Mercados', 'Ayuda alimentaria de emergencia tras inundación.', 120000, 'Resuelto', 'Comité Social', 5)

  // Relleno aleatorio hasta ~40 gestiones
  const montos = [50000, 85000, 120000, 180000, 250000, 320000, 400000]
  const responsables = ['Comité de Salud', 'Gestión Humana', 'Comité Social', 'Finanzas', 'Asesoría Legal', 'Obras Públicas']
  for (let i = 0; i < 24; i++) {
    const cat = CATEGORIAS[Math.floor(rng() * CATEGORIAS.length)]
    const p = personas[Math.floor(rng() * personas.length)]
    const conMonto = cat === 'Recursos/Dinero' || cat === 'Ayudas/Mercados'
    const r = rng()
    const estado: Gestion['estado'] = r < 0.4 ? 'Resuelto' : r < 0.65 ? 'En Proceso' : r < 0.9 ? 'Pendiente' : 'Cancelado'
    g.push({
      id: 'G' + String(g.length + 1).padStart(3, '0'),
      personaId: p.id,
      fecha: new Date(hoy - 86400000 * Math.floor(rng() * 20)).toISOString().slice(0, 10),
      categoria: cat,
      descripcion: DESCS[cat][Math.floor(rng() * DESCS[cat].length)],
      monto: conMonto ? montos[Math.floor(rng() * montos.length)] : 0,
      estado,
      responsable: responsables[Math.floor(rng() * responsables.length)],
      creadoEn: new Date().toISOString(),
      creadoPor: 'seed',
    })
  }
  return g
}

export function generarEstado(): DB {
  const rng = mulberry32(20240517)

  // 1) Censo electoral (departamento/municipio/comuna|corregimiento/barrio/puesto/mesa por cédula)
  const censo: CensoEntry[] = []
  const cedulasUsadas = new Set<string>()
  const pushCenso = (p: Puesto, n: number) => {
    for (let i = 0; i < n; i++) {
      let ced: string
      do {
        ced = String(100000000 + Math.floor(rng() * 899999999))
      } while (cedulasUsadas.has(ced))
      cedulasUsadas.add(ced)
      censo.push({
        cedula: ced,
        nombres: NOMBRES[Math.floor(rng() * NOMBRES.length)],
        apellidos: APELLIDOS[Math.floor(rng() * APELLIDOS.length)] + ' ' + APELLIDOS[Math.floor(rng() * APELLIDOS.length)],
        departamento: p.departamento,
        municipio: p.municipio,
        zona: p.zona,
        comuna: p.comuna,
        corregimiento: p.corregimiento,
        barrio: p.barrio,
        puesto: p.id,
        puestoNombre: p.nombre,
        mesa: p.mesaBase + Math.floor(rng() * p.mesas),
      })
    }
  }
  PUESTOS.forEach((p) => {
    if (p.municipio === MUNICIPIO_CAMPANA && p.zona === 'Urbana') pushCenso(p, 32)
    else if (p.municipio === MUNICIPIO_CAMPANA && p.zona === 'Rural') pushCenso(p, 16)
    else if (p.departamento === DEPARTAMENTO_CAMPANA) pushCenso(p, 30)
    else pushCenso(p, 20)
  })

  // Pools por categoría de validez
  const validUrban = censo.filter((c) => c.municipio === MUNICIPIO_CAMPANA && c.zona === 'Urbana')
  const validRural = censo.filter((c) => c.municipio === MUNICIPIO_CAMPANA && c.zona === 'Rural')
  const validAll = [...validUrban, ...validRural]
  const otherMun = censo.filter((c) => c.departamento === DEPARTAMENTO_CAMPANA && c.municipio !== MUNICIPIO_CAMPANA)
  const otherDept = censo.filter((c) => c.departamento !== DEPARTAMENTO_CAMPANA)

  const personas: Persona[] = []
  const anioActual = new Date().getFullYear()
  const usado = new Set<string>()

  const tomar = (pool: CensoEntry[]): CensoEntry | undefined => {
    for (let k = 0; k < 60; k++) {
      const c = pool[Math.floor(rng() * pool.length)]
      if (!usado.has(c.cedula)) {
        usado.add(c.cedula)
        return c
      }
    }
    const c = pool.find((x) => !usado.has(x.cedula))
    if (c) {
      usado.add(c.cedula)
      return c
    }
    const c2 = censo.find((x) => !usado.has(x.cedula))
    if (c2) {
      usado.add(c2.cedula)
      return c2
    }
    return undefined
  }

  const makePersona = (cen: CensoEntry, lid: string): Persona => {
    const ed = 18 + Math.floor(rng() * 62)
    const fecha = `${anioActual - ed}-${pad(1 + Math.floor(rng() * 12))}-${pad(1 + Math.floor(rng() * 28))}`
    const vr = rng()
    const nVeh = vr < 0.55 ? 0 : vr < 0.85 ? 1 : vr < 0.97 ? 2 : 3
    const vehiculos: Vehiculo[] = []
    for (let i = 0; i < nVeh; i++) {
      const tr = rng()
      const tipo: TipoVehiculo = tr < 0.4 ? 'Moto' : tr < 0.75 ? 'Automóvil' : tr < 0.93 ? 'Camioneta' : 'Bus'
      let cap = 1
      if (tipo === 'Moto') cap = 1
      else if (tipo === 'Automóvil') cap = 1 + Math.floor(rng() * 4)
      else if (tipo === 'Camioneta') cap = 5 + Math.floor(rng() * 10)
      else cap = 15 + Math.floor(rng() * 25)
      const aDisp = rng() < 0.7
      const er = rng()
      const estado: EstadoVehiculo = aDisp ? (er < 0.2 ? 'En ruta' : er < 0.3 ? 'Completado' : 'Disponible') : 'Disponible'
      vehiculos.push({ tipo, capacidadPasajeros: cap, aDisposicion: aDisp, estado })
    }
    const nr = rng()
    const nivelAcademico: NivelAcademico =
      nr < 0.05 ? 'Sin estudios' : nr < 0.13 ? 'Primaria' : nr < 0.58 ? 'Bachiller' : nr < 0.78 ? 'Técnico' : nr < 0.9 ? 'Tecnólogo' : 'Profesional'
    const profesion =
      nivelAcademico === 'Técnico' || nivelAcademico === 'Tecnólogo' || nivelAcademico === 'Profesional'
        ? PROFESIONES[Math.floor(rng() * PROFESIONES.length)]
        : 'Sin profesión'
    let posgrado: Posgrado = 'Ninguno'
    if (nivelAcademico === 'Profesional') {
      const pr = rng()
      posgrado = pr < 0.2 ? 'Especialización' : pr < 0.35 ? 'Maestría' : pr < 0.4 ? 'Doctorado' : 'Ninguno'
    }
    const intereses = [...INTERESES].sort(() => rng() - 0.5).slice(0, 2 + Math.floor(rng() * 3))
    const gruposSociales: string[] = []
    const gr = rng()
    const nGrupos = gr < 0.7 ? 0 : gr < 0.95 ? 1 : 2
    for (let g = 0; g < nGrupos; g++) {
      const gs = GRUPOS_SOCIALES[Math.floor(rng() * GRUPOS_SOCIALES.length)]
      if (!gruposSociales.includes(gs)) gruposSociales.push(gs)
    }
    const nv = rng() < 0.55 ? 'Firme' : rng() < 0.8 ? 'Indeciso' : 'En Riesgo'
    let rol: Persona['rolDiaE'] = 'Votante'
    if (vehiculos.some((v) => v.aDisposicion) && rng() < 0.5) rol = 'Conductor'
    else if (rng() < 0.08) rol = 'Testigo electoral'
    return {
      id: 'S' + String(personas.length + 1).padStart(4, '0'),
      nombres: cen.nombres,
      apellidos: cen.apellidos,
      cedula: cen.cedula,
      fechaNacimiento: fecha,
      telefono: '3' + String(100000000 + Math.floor(rng() * 899999999)).slice(0, 9),
      correo:
        cen.nombres.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') +
        '.' +
        cen.apellidos.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') +
        Math.floor(rng() * 90 + 10) +
        '@gmail.com',
      direccion:
        (['Calle', 'Carrera', 'Diagonal', 'Transversal'][Math.floor(rng() * 4)]) +
        ' ' + Math.floor(rng() * 80 + 1) +
        ' # ' + Math.floor(rng() * 80 + 1) +
        '-' + Math.floor(rng() * 90 + 1),
      departamento: cen.departamento,
      municipio: cen.municipio,
      zona: cen.zona,
      comuna: cen.comuna,
      corregimiento: cen.corregimiento,
      barrio: cen.barrio,
      puesto: cen.puesto,
      mesa: cen.mesa,
      intereses,
      gruposSociales,
      ocupacion: OCUPACIONES[Math.floor(rng() * OCUPACIONES.length)],
      profesion,
      nivelAcademico,
      posgrado,
      observacion: '',
      vehiculos,
      liderId: lid,
      nivelVoto: nv,
      rolDiaE: rol,
      votoRegistrado: false,
      votoHora: '',
      habeasData: rng() < 0.95,
      habeasDataFecha: hoyISO(),
      esLider: false,
      creadoEn: new Date().toISOString(),
      creadoPor: 'seed',
    }
  }

  // 2) Líderes como personas (digitadores de alto compromiso)
  const perfiles = [
    { profesion: 'Administrador/a', nivelAcademico: 'Profesional' as const, posgrado: 'Especialización' as const },
    { profesion: 'Comunicador/a', nivelAcademico: 'Profesional' as const, posgrado: 'Ninguno' as const },
    { profesion: 'Ingeniero/a', nivelAcademico: 'Profesional' as const, posgrado: 'Ninguno' as const },
    { profesion: 'Trabajador/a Social', nivelAcademico: 'Profesional' as const, posgrado: 'Ninguno' as const },
    { profesion: 'Sin profesión', nivelAcademico: 'Tecnólogo' as const, posgrado: 'Ninguno' as const },
    { profesion: 'Sin profesión', nivelAcademico: 'Bachiller' as const, posgrado: 'Ninguno' as const },
    { profesion: 'Candidato/a', nivelAcademico: 'Profesional' as const, posgrado: 'Ninguno' as const },
  ]
  LIDERES_INFO.forEach((l, i) => {
    const p = buscarPuesto(l.puestos[0])!
    personas.push({
      id: 'S' + (i + 1),
      nombres: l.nombres,
      apellidos: l.apellidos,
      cedula: l.cedula,
      fechaNacimiento: `${anioActual - 28 - i}-${pad(3 + i)}-${pad(15 + i)}`,
      telefono: '3' + String(100000000 + Math.floor(rng() * 899999999)).slice(0, 9),
      correo: l.userId + '@campana.com',
      direccion: 'Barrio ' + p.barrio,
      departamento: p.departamento,
      municipio: p.municipio,
      zona: p.zona,
      comuna: p.comuna,
      corregimiento: p.corregimiento,
      barrio: p.barrio,
      puesto: p.id,
      mesa: p.mesaBase,
      intereses: ['Empleo', 'Infraestructura'],
      gruposSociales: [],
      ocupacion: 'Coordinador de zona',
      profesion: perfiles[i].profesion,
      nivelAcademico: perfiles[i].nivelAcademico,
      posgrado: perfiles[i].posgrado,
      observacion: '',
      vehiculos: l.vehiculos,
      liderId: l.id,
      nivelVoto: 'Firme',
      rolDiaE: l.rolDiaE,
      votoRegistrado: true,
      votoHora: '07:00',
      habeasData: true,
      habeasDataFecha: hoyISO(),
      esLider: true,
      userId: l.userId,
      metaVotos: l.meta,
      creadoEn: new Date().toISOString(),
      creadoPor: 'seed',
    })
  })

  // 2b) Padrinos que también son simpatizantes (quienes tienen personaId)
  PADRINOS_INFO.filter((p) => p.personaId).forEach((p, i) => {
    const pv = PUESTOS[i % PUESTOS.length]
    personas.push({
      id: p.personaId!,
      nombres: p.nombres,
      apellidos: p.apellidos,
      cedula: p.cedula,
      fechaNacimiento: `${anioActual - 25 - i}-${pad(1 + i)}-${pad(10 + i)}`,
      telefono: '3' + String(200000000 + Math.floor(rng() * 899999999)).slice(0, 9),
      correo: p.userId + '@campana.com',
      direccion: 'Sede de campaña',
      departamento: 'Cesar',
      municipio: 'Valledupar',
      zona: 'Urbana',
      comuna: 'Comuna 1',
      barrio: 'Centro',
      puesto: pv.id,
      mesa: pv.mesaBase,
      intereses: ['Empleo'],
      gruposSociales: [],
      ocupacion: 'Digitador / Mesa de datos',
      profesion: 'Administrador/a',
      nivelAcademico: 'Profesional',
      posgrado: 'Ninguno',
      observacion: '',
      vehiculos: [],
      nivelVoto: 'Firme',
      rolDiaE: 'Votante',
      votoRegistrado: false,
      votoHora: '',
      habeasData: true,
      habeasDataFecha: hoyISO(),
      esLider: false,
      esPadrino: true,
      creadoEn: new Date().toISOString(),
      creadoPor: 'seed',
    })
  })

  // 3) 500 simpatizantes distribuidos entre los 6 líderes
  const cuotas: [LiderInfo, number][] = [
    [LIDERES_INFO[0], 90],
    [LIDERES_INFO[1], 90],
    [LIDERES_INFO[2], 85],
    [LIDERES_INFO[3], 70],
    [LIDERES_INFO[4], 70],
    [LIDERES_INFO[5], 95],
    [LIDERES_INFO[6], 30],
  ]
  for (const [l, n] of cuotas) {
    const terPool = censo.filter((c) => l.puestos.includes(c.puesto))
    for (let i = 0; i < n; i++) {
      let cen: CensoEntry | undefined
      if (rng() < l.errorRate) {
        cen = rng() < 0.6 ? tomar(otherMun) : tomar(otherDept)
      } else {
        cen = rng() < 0.45 ? tomar(terPool) : tomar(validAll)
      }
      if (!cen) cen = tomar(validAll)
      if (!cen) continue
      personas.push(makePersona(cen, l.id))
    }
  }

  // 3b) Planillas físicas y asignación a simpatizantes (auditoría Habeas Data)
  const planillas: Planilla[] = [
    { id: 'PLA1', codigo: 'PL-00001', liderId: 'L1', padrinoId: 'P1', estado: 'cargada', fechaEntrega: '2025-01-10', fechaDigitacion: '2025-01-11', registros: 20 },
    { id: 'PLA2', codigo: 'PL-00002', liderId: 'L1', padrinoId: 'P1', estado: 'entregada', fechaEntrega: '2025-01-12', fechaDigitacion: '', registros: 15 },
    { id: 'PLA3', codigo: 'PL-00003', liderId: 'L2', padrinoId: 'P1', estado: 'completa', fechaEntrega: '2025-01-11', fechaDigitacion: '2025-01-12', registros: 25 },
    { id: 'PLA4', codigo: 'PL-00004', liderId: 'L3', padrinoId: 'P2', estado: 'auditada', fechaEntrega: '2025-01-08', fechaDigitacion: '2025-01-09', registros: 18 },
    { id: 'PLA5', codigo: 'PL-00005', liderId: 'L4', padrinoId: 'P2', estado: 'entregada', fechaEntrega: '2025-01-13', fechaDigitacion: '', registros: 12 },
    { id: 'PLA6', codigo: 'PL-00006', liderId: 'L5', padrinoId: 'P3', estado: 'cargada', fechaEntrega: '2025-01-12', fechaDigitacion: '2025-01-13', registros: 22 },
    { id: 'PLA7', codigo: 'PL-00007', liderId: 'L6', padrinoId: 'P3', estado: 'entregada', fechaEntrega: '2025-01-13', fechaDigitacion: '', registros: 10 },
    { id: 'PLA8', codigo: 'PL-00008', liderId: 'L0', padrinoId: 'P1', estado: 'cargada', fechaEntrega: '2025-01-14', fechaDigitacion: '2025-01-15', registros: 30 },
  ]
  const codigosPorLider: Record<string, string[]> = {}
  planillas.forEach((pl) => {
    ;(codigosPorLider[pl.liderId] = codigosPorLider[pl.liderId] || []).push(pl.codigo)
  })
  personas.forEach((p) => {
    if (p.esLider || p.esPadrino) return
    const codigos = codigosPorLider[p.liderId ?? '']
    if (codigos && codigos.length > 0) {
      p.planillaCodigo = codigos[Math.floor(rng() * codigos.length)]
      if (rng() < 0.3) p.telefono = ''
    }
  })

  // 4) Inyectar cumpleañeros de "hoy" y "esta semana"
  const hoy = new Date()
  ;[0, 1, 2, 3, 5, 6].forEach((offset, idx) => {
    const p = personas[6 + idx * 40]
    if (!p) return
    const d = new Date(hoy)
    d.setDate(hoy.getDate() + offset)
    p.fechaNacimiento = `${anioActual - (20 + idx * 8)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })

  const gestiones = generarGestiones(personas, rng)

  const seedEnvios = [
    { dias: 3, canal: 'WhatsApp API' as const, segmento: 'Comunas 1–2 · Firmes', mensaje: '¡Gracias por tu compromiso! Este sábado nos vemos en el punto de encuentro 🗳️', destinatarios: 45 },
    { dias: 1, canal: 'SMS' as const, segmento: 'Con vehículo · Valledupar', mensaje: 'Te esperamos el Día E como conductor voluntario. Confirma tu disponibilidad.', destinatarios: 38 },
    { dias: 2, canal: 'Email' as const, segmento: 'Profesionales · Valledupar', mensaje: 'Invitación al foro de propuestas para el sector profesional.', destinatarios: 57 },
    { dias: 4, canal: 'Llamada' as const, segmento: 'Adulto mayor · Comuna 1', mensaje: 'Confirmación telefónica de transporte para el Día E.', destinatarios: 24 },
    { dias: 5, canal: 'WhatsApp API' as const, segmento: 'Mujeres · Todas las zonas', mensaje: 'Te invitamos a la jornada de mujeres lideresas este viernes 💜', destinatarios: 132 },
    { dias: 6, canal: 'SMS' as const, segmento: 'Indecisos · Valledupar', mensaje: 'Hablemos de tus propuestas. Te visitamos esta semana.', destinatarios: 41 },
    { dias: 8, canal: 'Email' as const, segmento: 'Corregimientos · Patillal y La Mina', mensaje: 'Reunión de obras rurales este sábado en la escuela de Patillal.', destinatarios: 35 },
    { dias: 9, canal: 'Llamada' as const, segmento: 'Individual · Andrés Ramírez', mensaje: 'Confirmación de participación como testigo electoral.', destinatarios: 1 },
    { dias: 12, canal: 'WhatsApp API' as const, segmento: 'Jóvenes · Valledupar', mensaje: 'Encuentro de jóvenes por Valledupar. Te esperamos 🎉', destinatarios: 88 },
    { dias: 15, canal: 'SMS' as const, segmento: 'Testigos electorales', mensaje: 'Recuerda la capacitación de testigos este domingo.', destinatarios: 16 },
    { dias: 20, canal: 'Email' as const, segmento: 'Solo válidos · Con posgrado', mensaje: 'Invitación al comité técnico de propuestas de gobierno.', destinatarios: 29 },
    { dias: 25, canal: 'WhatsApp API' as const, segmento: 'Recordatorio Día E · Todos', mensaje: 'Este domingo es el Día E. ¡Tu voto cuenta! 🗳️', destinatarios: 250 },
    { dias: 0, canal: 'WhatsApp API' as const, segmento: 'Firmes · Comunas 3-4', mensaje: 'Último recordatorio: este domingo tu voto nos representa. ¡Gracias! 🗳️', destinatarios: 64 },
    { dias: 7, canal: 'SMS' as const, segmento: 'Conductores · Valledupar', mensaje: 'Punto de encuentro de conductores a las 6:00 a.m. en el comando central.', destinatarios: 22 },
    { dias: 10, canal: 'Llamada' as const, segmento: 'Indecisos · Corregimientos', mensaje: 'Llamada de seguimiento para resolver dudas de la propuesta rural.', destinatarios: 30 },
    { dias: 11, canal: 'Email' as const, segmento: 'Profesionales con posgrado', mensaje: 'Invitación al comité académico de la campaña.', destinatarios: 21 },
    { dias: 13, canal: 'WhatsApp API' as const, segmento: 'Jóvenes · Primer voto', mensaje: 'Tu primer voto cuenta. Acompáñanos a la jornada informativa.', destinatarios: 95 },
    { dias: 14, canal: 'SMS' as const, segmento: 'Adulto mayor · Transporte Día E', mensaje: 'Confirma tu ruta de transporte para el Día E.', destinatarios: 48 },
    { dias: 16, canal: 'Llamada' as const, segmento: 'Líderes · Cierre de campaña', mensaje: 'Reunión de cierre con todos los líderes de zona.', destinatarios: 6 },
    { dias: 18, canal: 'WhatsApp API' as const, segmento: 'Grupos sociales · Mujeres y negritudes', mensaje: 'Encuentro de diversidad e inclusión este sábado.', destinatarios: 72 },
    { dias: 21, canal: 'Email' as const, segmento: 'Empresarios · Valledupar', mensaje: 'Presentación de propuestas de desarrollo económico.', destinatarios: 18 },
    { dias: 23, canal: 'SMS' as const, segmento: 'Testigos · Comuna 5 y 6', mensaje: 'Confirmación de puesto de votación y horario.', destinatarios: 26 },
    { dias: 27, canal: 'WhatsApp API' as const, segmento: 'Recordatorio · Todos', mensaje: 'No olvides tu cédula y tu puesto de votación.', destinatarios: 250 },
    { dias: 30, canal: 'Llamada' as const, segmento: 'Individual · María Gómez', mensaje: 'Seguimiento a solicitud de empleo gestionada.', destinatarios: 1 },
  ]
  const comunicaciones = seedEnvios.map((e, i) => ({
    id: 'C' + (i + 1),
    fecha: new Date(Date.now() - 86400000 * e.dias).toISOString(),
    canal: e.canal,
    segmento: e.segmento,
    mensaje: e.mensaje,
    destinatarios: e.destinatarios,
    usuario: 'admin',
  }))

  const logsHabeas = personas.map((p) => ({
    fecha: p.creadoEn,
    cedula: p.cedula,
    nombre: p.nombres + ' ' + p.apellidos,
    accion: 'Autorización registrada',
    estado: p.habeasData ? 'Autorizado' : 'Pendiente',
    usuario: 'Sistema',
  }))

  // Día E — estado inicial (simulación en tiempo real)
  const horaDiaE = '10:00'
  const firmesValidos = personas.filter((p) => p.nivelVoto === 'Firme' && esValido(p) && !p.esLider)
  const nVotados = Math.floor(firmesValidos.length * 0.35)
  const votados = [...firmesValidos].sort(() => rng() - 0.5).slice(0, nVotados)
  const votosPorLider: Record<string, number> = {}
  votados.forEach((p, idx) => {
    p.votoRegistrado = true
    const h = 7 + Math.floor((idx / nVotados) * 3)
    p.votoHora = `${pad(h)}:${pad(Math.floor(rng() * 60))}`
    const lid = p.liderId ?? ''
    votosPorLider[lid] = (votosPorLider[lid] || 0) + 1
  })

  const actividadDiaE: ActividadDiaE[] = []
  LIDERES_INFO.forEach((l, i) => {
    actividadDiaE.push({
      id: 'A' + String(i + 1).padStart(3, '0'),
      hora: '06:50',
      liderId: l.id,
      tipo: 'Apertura',
      detalle: `${l.nombres} ${l.apellidos} inició la jornada`,
    })
  })
  Object.entries(votosPorLider).forEach(([lid, n], i) => {
    actividadDiaE.push({
      id: 'A' + String(i + 7).padStart(3, '0'),
      hora: '09:45',
      liderId: lid,
      tipo: 'Votos',
      detalle: `Registró ${n} votos`,
    })
  })

  const padrinoLider: Record<string, string> = {}
  LIDERES_INFO.forEach((l) => {
    padrinoLider[l.id] = l.padrinoId ?? ''
  })
  const padrinos: PadrinoInfo[] = PADRINOS_INFO.map((p) => ({
    id: p.id,
    nombre: `${p.nombres} ${p.apellidos}`,
    cedula: p.cedula,
    sector: p.sector,
    activo: true,
    personaId: p.personaId,
    userId: p.userId,
  }))

  return { censo, personas, gestiones, comunicaciones, logsHabeas, actividadDiaE, planillas, padrinoLider, padrinos, usuarios: [...USUARIOS], horaDiaE, generado: new Date().toISOString() }
}
