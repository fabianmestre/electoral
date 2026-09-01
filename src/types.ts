export type UserRole = 'admin' | 'subadmin' | 'padrino'
export type Permiso = 'conectividad' | 'usuarios' | 'datos' | 'reset'
export type NivelVoto = 'Firme' | 'Indeciso' | 'En Riesgo'
export type RolDiaE = 'Votante' | 'Conductor' | 'Testigo electoral'
export type TipoVehiculo = 'Moto' | 'Automóvil' | 'Camioneta' | 'Bus'
export type EstadoVehiculo = 'Disponible' | 'En ruta' | 'Completado'
export type CategoriaGestion =
  | 'Salud'
  | 'Empleo'
  | 'Ayudas/Mercados'
  | 'Recursos/Dinero'
  | 'Trámites/Asesoría'
  | 'Obras comunitarias'
export type EstadoGestion = 'Pendiente' | 'En Proceso' | 'Resuelto' | 'Cancelado'
export type Canal = 'WhatsApp API' | 'SMS' | 'Email' | 'Llamada'
export type ZonaGeografica = 'Urbana' | 'Rural'
export type Validez = 'valido' | 'fuera_municipio' | 'fuera_departamento'
export type NivelAcademico = 'Sin estudios' | 'Primaria' | 'Bachiller' | 'Técnico' | 'Tecnólogo' | 'Profesional'
export type Posgrado = 'Ninguno' | 'Especialización' | 'Maestría' | 'Doctorado'

export interface Vehiculo {
  tipo: TipoVehiculo
  capacidadPasajeros: number
  aDisposicion: boolean
  estado: EstadoVehiculo
}

export interface Usuario {
  id: string
  nombre: string
  email: string
  pass: string
  rol: UserRole
  padrinoId?: string
  permisos?: Permiso[]
}

export interface Puesto {
  id: string
  nombre: string
  departamento: string
  municipio: string
  zona: ZonaGeografica
  comuna?: string
  corregimiento?: string
  barrio: string
  mesaBase: number
  mesas: number
}

export interface LiderInfo {
  id: string
  userId: string
  nombres: string
  apellidos: string
  cedula: string
  meta: number
  territorio: string
  puestos: string[]
  errorRate: number
  rolDiaE: RolDiaE
  vehiculos: Vehiculo[]
  padrinoId?: string
}

export interface CensoEntry {
  cedula: string
  nombres: string
  apellidos: string
  departamento: string
  municipio: string
  zona: ZonaGeografica
  comuna?: string
  corregimiento?: string
  barrio: string
  puesto: string
  puestoNombre: string
  mesa: number
}

export interface Persona {
  id: string
  nombres: string
  apellidos: string
  cedula: string
  fechaNacimiento: string
  telefono: string
  correo: string
  direccion: string
  departamento: string
  municipio: string
  zona: ZonaGeografica
  comuna?: string
  corregimiento?: string
  barrio: string
  puesto: string
  mesa: number
  intereses: string[]
  gruposSociales: string[]
  ocupacion: string
  profesion: string
  nivelAcademico: NivelAcademico
  posgrado: Posgrado
  observacion: string
  vehiculos: Vehiculo[]
  liderId?: string
  nivelVoto: NivelVoto
  rolDiaE: RolDiaE
  votoRegistrado: boolean
  votoHora: string
  habeasData: boolean
  habeasDataFecha: string
  esLider: boolean
  esPadrino?: boolean
  planillaCodigo?: string
  userId?: string
  metaVotos?: number
  creadoEn: string
  creadoPor: string
}

export interface Gestion {
  id: string
  personaId?: string
  fecha: string
  categoria: CategoriaGestion
  descripcion: string
  monto: number
  estado: EstadoGestion
  responsable: string
  creadoEn: string
  creadoPor: string
}

export interface Comunicacion {
  id: string
  fecha: string
  canal: Canal
  segmento: string
  mensaje: string
  destinatarios: number
  usuario: string
}

export interface LogHabeas {
  fecha: string
  cedula: string
  nombre: string
  accion: string
  estado: string
  usuario: string
}

export interface ActividadDiaE {
  id: string
  hora: string
  liderId: string
  tipo: string
  detalle: string
}

export type EstadoPlanilla = 'entregada' | 'cargada' | 'completa' | 'auditada'

export interface Planilla {
  id: string
  codigo: string
  liderId: string
  padrinoId: string
  estado: EstadoPlanilla
  fechaEntrega: string
  fechaDigitacion: string
  registros: number
  observaciones?: string
}

export interface PadrinoInfo {
  id: string
  nombre: string
  cedula: string
  sector: string
  activo: boolean
  personaId?: string
  userId?: string
}

export interface DB {
  censo: CensoEntry[]
  personas: Persona[]
  gestiones: Gestion[]
  comunicaciones: Comunicacion[]
  logsHabeas: LogHabeas[]
  actividadDiaE: ActividadDiaE[]
  planillas: Planilla[]
  padrinoLider: Record<string, string>
  padrinos: PadrinoInfo[]
  usuarios: Usuario[]
  horaDiaE: string
  generado: string
}

export interface FiltrosEnvio {
  liderId: string
  departamento: string
  municipio: string
  zona: string
  comuna: string
  corregimiento: string
  barrio: string
  puesto: string
  tieneVehiculo: boolean
  interes: string
  grupoSocial: string
  ocupacion: string
  profesion: string
  nivelAcademico: string
  posgrado: string
  nivelVoto: string
  rolDiaE: string
  validez: string
  categoria: string
  estado: string
  conGestiones: string
  cumpleanos: boolean
}

export type PersonaInput = Omit<
  Persona,
  'id' | 'esLider' | 'esPadrino' | 'planillaCodigo' | 'userId' | 'metaVotos' | 'habeasDataFecha' | 'creadoEn' | 'creadoPor' | 'votoRegistrado' | 'votoHora'
>

export type GestionInput = Omit<Gestion, 'id' | 'creadoEn' | 'creadoPor'>
