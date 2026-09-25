import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  ActividadDiaEApi,
  Canal,
  DB,
  Gestion,
  GestionApi,
  GestionApiInput,
  GestionInput,
  LiderApi,
  LiderApiInput,
  PadrinoApi,
  PadrinoApiInput,
  PadrinoInfo,
  PersonaInput,
  RolSimpatizante,
  SimpatizanteApi,
  UsuarioApi,
  Usuario,
} from './types'
import { generarEstado, LS_KEY, esValido, getPersona } from './data'
import { hoyISO, uid } from './lib'
import { restaurarSesion } from './authSession'
import { ROUTES, viewFromPath } from './app/routes'

export type ViewId =
  | 'digitador'
  | 'consulta-puesto'
  | 'dashboard'
  | 'lideres'
  | 'gestiones'
  | 'comunicaciones'
  | 'logistica'
  | 'censo'
  | 'directorio'
  | 'simpatizantes'
  | 'talento'
  | 'legal'
  | 'perfil'
  | 'padrino-dash'
  | 'padrino-planillas'
  | 'padrino-simpatizantes'
  | 'padrinos'
  | 'padrino-roles'
  | 'simpatizante-detalle'
  | 'gestion-lideres'
  | 'lider-directorio'
  | 'gestores'

export type ToastType = 'success' | 'info' | 'error' | 'warn'

export interface PersonaModalState {
  mode: 'new' | 'edit'
  personaId?: string
}
export interface GestionModalState {
  mode: 'new' | 'edit'
  gestionId?: string
  personaId?: string
}
export interface DirectorioPreset {
  liderId?: string
  validez?: string
  nivelVoto?: string
  puesto?: string
  mesa?: number
  municipio?: string
  comuna?: string
  corregimiento?: string
  barrio?: string
  interes?: string
  grupoSocial?: string
  nivelAcademico?: string
}

interface AppContextValue {
  db: DB
  session: Usuario | null
  authLoading: boolean
  authError: string | null
  retryAuth: () => void
  view: ViewId
  perfilId: string | null
  personaModal: PersonaModalState | null
  gestionModal: GestionModalState | null
  toast: { msg: string; type: ToastType } | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  navigate: (v: ViewId) => void
  verPerfil: (id: string) => void
  volver: () => void
  openPersona: (m: PersonaModalState) => void
  closePersona: () => void
  openGestion: (m: GestionModalState) => void
  closeGestion: () => void
  savePersona: (datos: PersonaInput) => Promise<void>
  saveGestion: (datos: GestionInput) => void
  deleteGestion: (id: string) => void
  toggleHabeas: (id: string) => void
  enviarComunicacion: (canal: Canal, mensaje: string, segmento: string, destinatarios: number) => void
  resetDatos: () => void
  simpatizantesApi: SimpatizanteApi[]
  usuariosApi: UsuarioApi[]
  cargarUsuariosApi: () => Promise<void>
  cargandoSimpatizantes: boolean
  cargarSimpatizantesApi: () => Promise<void>
  cargarSimpatizanteDetalle: (id: string) => Promise<SimpatizanteApi | null>
  borrarTodosSimpatizantes: () => Promise<void>
  eliminarSimpatizante: (id: string) => Promise<void>
  simpatizanteDetalleId: string | null
  verSimpatizanteDetalle: (id: string) => void
  lideresApi: LiderApi[]
  cargandoLideres: boolean
  cargarLideresApi: () => Promise<void>
  crearLiderApi: (datos: LiderApiInput) => Promise<boolean>
  editarLiderApi: (id: string, datos: Partial<LiderApiInput>) => Promise<boolean>
  eliminarLiderApi: (id: string) => Promise<void>
  padrinosApi: PadrinoApi[]
  cargandoPadrinos: boolean
  cargarPadrinosApi: () => Promise<void>
  crearPadrinoApi: (datos: PadrinoApiInput) => Promise<{ email: string | null; password: string | null } | null>
  editarPadrinoApi: (id: string, datos: Partial<{ nombre: string; cedula: string | null; sector: string | null; activo: boolean }>) => Promise<boolean>
  resetClavePadrinoApi: (id: string) => Promise<string | null>
  gestionesApi: GestionApi[]
  cargandoGestiones: boolean
  cargarGestionesApi: () => Promise<void>
  crearGestionApi: (datos: GestionApiInput) => Promise<boolean>
  editarGestionApi: (id: string, datos: Partial<GestionApiInput>) => Promise<boolean>
  eliminarGestionApi: (id: string) => Promise<void>
  actividadDiaEApi: ActividadDiaEApi[]
  cargandoActividad: boolean
  cargarActividadApi: () => Promise<void>
  registrarVotoApi: (simpatizanteId: string) => Promise<boolean>
  cambiarRolSimpatizante: (simpatizanteId: string, rol: RolSimpatizante) => Promise<boolean>
  crearActividadApi: (datos: { liderId: string; tipo: 'Apertura' | 'Voto' | 'Nota'; detalle: string }) => Promise<boolean>
  notify: (msg: string, type?: ToastType) => void
  liderFilter: string
  setLiderFilter: (v: string) => void
  directorioPreset: DirectorioPreset | null
  irADirectorio: (preset: DirectorioPreset) => void
  clearDirectorioPreset: () => void
  comunicacionesPreset: { cumpleanos?: boolean } | null
  irAComunicaciones: (preset: { cumpleanos?: boolean }) => void
  clearComunicacionesPreset: () => void
  gestionesPreset: { estado?: string; conMonto?: string } | null
  irAGestiones: (preset: { estado?: string; conMonto?: string }) => void
  clearGestionesPreset: () => void
  registrarVoto: (id: string) => void
  simularAvance: () => void
  asignarPadrino: (liderId: string, padrinoId: string) => void
  quitarRolPadrino: (padrinoId: string) => void
  promoverPadrino: (personaId: string) => void
  nuevoPadrino: (nombre: string, cedula: string, sector: string) => void
  cambiarPassword: (userId: string, nuevaPass: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DB
      if (
        parsed &&
        Array.isArray(parsed.personas) &&
        Array.isArray(parsed.planillas) &&
        parsed.padrinoLider &&
        Array.isArray(parsed.padrinos) &&
        Array.isArray(parsed.usuarios)
      ) {
        return parsed
      }
    }
  } catch {
    /* ignore */
  }
  return generarEstado()
}

function usuarioPadrino(padrinoId: string, nombre: string): Usuario {
  const id = uid('pad')
  return { id, nombre, email: `${id}@campana.com`, pass: 'padrino123', rol: 'padrino', padrinoId }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => loadDB())
  const [session, setSession] = useState<Usuario | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authAttempt, setAuthAttempt] = useState(0)
  const restoration = useRef<Promise<Usuario | null> | null>(null)
  const retryAuth = () => {
    restoration.current = null
    setAuthError(null)
    setAuthLoading(true)
    setAuthAttempt((attempt) => attempt + 1)
  }
  const [view, setView] = useState<ViewId>(() => viewFromPath(window.location.pathname) ?? 'dashboard')
  const [perfilId, setPerfilId] = useState<string | null>(null)
  const [personaModal, setPersonaModal] = useState<PersonaModalState | null>(null)
  const [gestionModal, setGestionModal] = useState<GestionModalState | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null)
  const toastTimer = useRef<number | null>(null)
  const [liderFilter, setLiderFilter] = useState<string>('all')
  const [directorioPreset, setDirectorioPreset] = useState<DirectorioPreset | null>(null)
  const [comunicacionesPreset, setComunicacionesPreset] = useState<{ cumpleanos?: boolean } | null>(null)
  const [gestionesPreset, setGestionesPreset] = useState<{ estado?: string; conMonto?: string } | null>(null)
  const [simpatizantesApi, setSimpatizantesApi] = useState<SimpatizanteApi[]>([])
  const [usuariosApi, setUsuariosApi] = useState<UsuarioApi[]>([])
  const [cargandoSimpatizantes, setCargandoSimpatizantes] = useState(false)
  const [simpatizanteDetalleId, setSimpatizanteDetalleId] = useState<string | null>(null)
  const [lideresApi, setLideresApi] = useState<LiderApi[]>([])
  const [cargandoLideres, setCargandoLideres] = useState(false)
  const [padrinosApi, setPadrinosApi] = useState<PadrinoApi[]>([])
  const [gestionesApi, setGestionesApi] = useState<GestionApi[]>([])
  const [actividadDiaEApi, setActividadDiaEApi] = useState<ActividadDiaEApi[]>([])
  const [cargandoActividad, setCargandoActividad] = useState(false)
  const [cargandoGestiones, setCargandoGestiones] = useState(false)
  const [cargandoPadrinos, setCargandoPadrinos] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(db))
    } catch {
      /* ignore */
    }
  }, [db])

  const notify = (msg: string, type: ToastType = 'info') => {
    setToast({ msg, type })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }

  const applySession = (u: Usuario) => {
    setSession(u)
    setPerfilId(null)
    const routeView = viewFromPath(window.location.pathname)
    setView(routeView ?? (u.rol === 'admin' ? 'dashboard' : u.rol === 'padrino' ? 'padrino-dash' : u.rol === 'digitador' || u.rol === 'lider' ? 'digitador' : u.rol === 'gestor' ? 'directorio' : 'comunicaciones'))
  }

  const cargarSimpatizantesApi = async () => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) return
    setCargandoSimpatizantes(true)
    try {
      const response = await fetch('/api/simpatizantes?limit=1000', { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar el directorio de simpatizantes.')
      setSimpatizantesApi(data.items ?? [])
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo cargar el directorio de simpatizantes.', 'error')
    } finally {
      setCargandoSimpatizantes(false)
    }
  }

  const cargarUsuariosApi = async () => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) return
    try {
      const response = await fetch('/api/usuarios', { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar los usuarios.')
      setUsuariosApi(data.items ?? [])
    } catch {
      /* no crítico para la carga inicial */
    }
  }

  const cargarLideresApi = async () => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) return
    setCargandoLideres(true)
    try {
      const response = await fetch('/api/lideres', { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar los líderes.')
      setLideresApi(data.items ?? [])
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo cargar los líderes.', 'error')
    } finally {
      setCargandoLideres(false)
    }
  }

  const crearLiderApi = async (datos: LiderApiInput): Promise<boolean> => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) {
      notify('Inicia sesión de nuevo para continuar', 'error')
      return false
    }
    try {
      const response = await fetch('/api/lideres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(datos),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo registrar el líder.')
      notify('Líder registrado', 'success')
      void cargarLideresApi()
      return true
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo registrar el líder.', 'error')
      return false
    }
  }

  const editarLiderApi = async (id: string, datos: Partial<LiderApiInput>): Promise<boolean> => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) {
      notify('Inicia sesión de nuevo para continuar', 'error')
      return false
    }
    try {
      const response = await fetch(`/api/lideres/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(datos),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el líder.')
      notify('Líder actualizado', 'success')
      void cargarLideresApi()
      return true
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo actualizar el líder.', 'error')
      return false
    }
  }

  const eliminarLiderApi = async (id: string) => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) {
      notify('Inicia sesión de nuevo para continuar', 'error')
      return
    }
    try {
      const response = await fetch(`/api/lideres/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo eliminar el líder.')
      notify('Líder eliminado', 'success')
      void cargarLideresApi()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo eliminar el líder.', 'error')
    }
  }

  const cargarPadrinosApi = async () => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) return
    setCargandoPadrinos(true)
    try {
      const response = await fetch('/api/padrinos', { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar los padrinos.')
      setPadrinosApi(data.items ?? [])
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo cargar los padrinos.', 'error')
    } finally {
      setCargandoPadrinos(false)
    }
  }

  const crearPadrinoApi = async (datos: PadrinoApiInput) => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) {
      notify('Inicia sesión de nuevo para continuar', 'error')
      return null
    }
    try {
      const response = await fetch('/api/padrinos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(datos),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo crear el padrino.')
      notify('Padrino creado', 'success')
      void cargarPadrinosApi()
      void cargarUsuariosApi()
      return { email: data.email as string, password: data.password as string }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo crear el padrino.', 'error')
      return null
    }
  }

  const editarPadrinoApi = async (
    id: string,
    datos: Partial<{ nombre: string; cedula: string | null; sector: string | null; activo: boolean }>,
  ) => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) {
      notify('Inicia sesión de nuevo para continuar', 'error')
      return false
    }
    try {
      const response = await fetch(`/api/padrinos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(datos),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el padrino.')
      notify('Padrino actualizado', 'success')
      void cargarPadrinosApi()
      void cargarUsuariosApi()
      return true
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo actualizar el padrino.', 'error')
      return false
    }
  }

  const resetClavePadrinoApi = async (id: string) => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) {
      notify('Inicia sesión de nuevo para continuar', 'error')
      return null
    }
    try {
      const response = await fetch(`/api/padrinos/${id}/clave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo restablecer la contraseña.')
      notify('Contraseña restablecida', 'success')
      return data.password as string
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo restablecer la contraseña.', 'error')
      return null
    }
  }

  const cargarGestionesApi = async () => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) return
    setCargandoGestiones(true)
    try {
      const response = await fetch('/api/gestiones?limit=2000', { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar las gestiones.')
      setGestionesApi(data.items ?? [])
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo cargar las gestiones.', 'error')
    } finally {
      setCargandoGestiones(false)
    }
  }

  const crearGestionApi = async (datos: GestionApiInput): Promise<boolean> => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) {
      notify('Inicia sesión de nuevo para continuar', 'error')
      return false
    }
    try {
      const response = await fetch('/api/gestiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(datos),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo registrar la gestión.')
      notify('Gestión registrada', 'success')
      void cargarGestionesApi()
      return true
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo registrar la gestión.', 'error')
      return false
    }
  }

  const editarGestionApi = async (id: string, datos: Partial<GestionApiInput>): Promise<boolean> => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) {
      notify('Inicia sesión de nuevo para continuar', 'error')
      return false
    }
    try {
      const response = await fetch(`/api/gestiones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(datos),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la gestión.')
      notify('Gestión actualizada', 'success')
      void cargarGestionesApi()
      return true
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo actualizar la gestión.', 'error')
      return false
    }
  }

  const eliminarGestionApi = async (id: string) => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) {
      notify('Inicia sesión de nuevo para continuar', 'error')
      return
    }
    try {
      const response = await fetch(`/api/gestiones/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo eliminar la gestión.')
      notify('Gestión eliminada', 'success')
      void cargarGestionesApi()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo eliminar la gestión.', 'error')
    }
  }

  const cargarActividadApi = async () => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) return
    setCargandoActividad(true)
    try {
      const response = await fetch('/api/actividad-dia-e?limit=200', { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar la actividad del Día E.')
      setActividadDiaEApi(data.items ?? [])
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo cargar la actividad del Día E.', 'error')
    } finally {
      setCargandoActividad(false)
    }
  }

  const cambiarRolSimpatizante = async (simpatizanteId: string, rol: RolSimpatizante): Promise<boolean> => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) {
      notify('Inicia sesión de nuevo para continuar', 'error')
      return false
    }
    try {
      const response = await fetch(`/api/simpatizantes/${simpatizanteId}/rol`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rol }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo cambiar el rol.')
      return true
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo cambiar el rol.', 'error')
      return false
    }
  }

  const registrarVotoApi = async (simpatizanteId: string): Promise<boolean> => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) {
      notify('Inicia sesión de nuevo para continuar', 'error')
      return false
    }
    try {
      const response = await fetch(`/api/simpatizantes/${simpatizanteId}/voto`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo registrar el voto.')
      notify('Voto registrado ✅', 'success')
      void cargarSimpatizantesApi()
      void cargarActividadApi()
      return true
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo registrar el voto.', 'error')
      return false
    }
  }

  const crearActividadApi = async (datos: { liderId: string; tipo: 'Apertura' | 'Voto' | 'Nota'; detalle: string }): Promise<boolean> => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) {
      notify('Inicia sesión de nuevo para continuar', 'error')
      return false
    }
    try {
      const response = await fetch('/api/actividad-dia-e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(datos),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo registrar la actividad.')
      void cargarActividadApi()
      return true
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo registrar la actividad.', 'error')
      return false
    }
  }

  const cargarSimpatizanteDetalle = async (id: string): Promise<SimpatizanteApi | null> => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) return null
    try {
      const response = await fetch(`/api/simpatizantes/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar la ficha.')
      return data as SimpatizanteApi
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo cargar la ficha.', 'error')
      return null
    }
  }

  useEffect(() => {
    let cancelled = false
    // Evita renovar dos veces durante la doble ejecución de efectos de StrictMode.
    restoration.current ??= restaurarSesion()
    restoration.current
      .then((user) => {
        if (!cancelled && user) {
          applySession(user)
          void cargarSimpatizantesApi()
          void cargarUsuariosApi()
          void cargarLideresApi()
        }
      })
      .catch(() => {
        if (!cancelled) setAuthError('No se pudo recuperar tu sesión. Revisa la conexión y vuelve a intentar.')
      })
      .finally(() => { if (!cancelled) setAuthLoading(false) })
    return () => { cancelled = true }
  }, [authAttempt])

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await response.json().catch(() => ({ error: 'No se pudo conectar con el backend.' }))
    if (!response.ok) throw new Error(data.error || 'No se pudo iniciar sesi?n.')
    sessionStorage.setItem('electoral.auth.token', data.accessToken)
    sessionStorage.setItem('electoral.auth.refresh', data.refreshToken)
    applySession(data.user)
    notify(`Bienvenido, ${data.user.nombre}`, 'success')
    void cargarSimpatizantesApi()
    void cargarUsuariosApi()
    void cargarLideresApi()
  }

  const logout = () => {
    const token = sessionStorage.getItem('electoral.auth.token')
    sessionStorage.removeItem('electoral.auth.token')
    sessionStorage.removeItem('electoral.auth.refresh')
    if (token) void fetch('/api/auth/logout', {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    setSession(null)
    setPerfilId(null)
    notify('Sesi?n cerrada', 'info')
  }

  const navigate = (v: ViewId) => {
    if (v !== 'perfil') setPerfilId(null)
    const route = ROUTES[v]
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
    setView(v)
  }

  const irADirectorio = (preset: DirectorioPreset) => {
    if (preset.liderId) setLiderFilter(preset.liderId)
    setDirectorioPreset(preset)
    setPerfilId(null)
    setView('directorio')
  }

  const clearDirectorioPreset = () => setDirectorioPreset(null)

  const irAComunicaciones = (preset: { cumpleanos?: boolean }) => {
    setComunicacionesPreset(preset)
    setPerfilId(null)
    setView('comunicaciones')
  }

  const clearComunicacionesPreset = () => setComunicacionesPreset(null)

  const irAGestiones = (preset: { estado?: string; conMonto?: string }) => {
    setGestionesPreset(preset)
    setPerfilId(null)
    setView('gestiones')
  }

  const clearGestionesPreset = () => setGestionesPreset(null)

  const registrarVoto = (id: string) => {
    const p = db.personas.find((x) => x.id === id)
    if (!p) return
    if (p.votoRegistrado) {
      notify('Este simpatizante ya votó', 'warn')
      return
    }
    setDb((prev) => ({
      ...prev,
      personas: prev.personas.map((x) =>
        x.id === id ? { ...x, votoRegistrado: true, votoHora: prev.horaDiaE } : x,
      ),
      actividadDiaE: [
        ...prev.actividadDiaE,
        { id: uid('A'), hora: prev.horaDiaE, liderId: p.liderId ?? '', tipo: 'Voto', detalle: `Registró el voto de ${p.nombres} ${p.apellidos}` },
      ],
    }))
    notify('Voto registrado ✅', 'success')
  }

  const simularAvance = () => {
    const [h, m] = db.horaDiaE.split(':').map(Number)
    if (h * 60 + m >= 18 * 60) {
      notify('Fin de la jornada (18:00)', 'info')
      return
    }
    setDb((prev) => {
      const [hh, mm] = prev.horaDiaE.split(':').map(Number)
      const totalMin = hh * 60 + mm + 60
      const nuevaHora = `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`
      const candidatos = prev.personas.filter((p) => p.nivelVoto === 'Firme' && esValido(p) && !p.votoRegistrado)
      const n = Math.min(18, candidatos.length)
      const elegidos = [...candidatos].sort(() => Math.random() - 0.5).slice(0, n)
      const personas = prev.personas.map((p) =>
        elegidos.some((e) => e.id === p.id) ? { ...p, votoRegistrado: true, votoHora: nuevaHora } : p,
      )
      const porLider: Record<string, number> = {}
      elegidos.forEach((p) => {
        const lid = p.liderId ?? ''
        porLider[lid] = (porLider[lid] || 0) + 1
      })
      const nuevasActividades = Object.entries(porLider).map(([lid, cant]) => ({
        id: uid('A'),
        hora: nuevaHora,
        liderId: lid,
        tipo: 'Votos',
        detalle: `Registró ${cant} votos`,
      }))
      const personasConVehiculos = personas.map((p) => ({
        ...p,
        vehiculos: p.vehiculos.map((v) => {
          if (v.aDisposicion && v.estado === 'Disponible' && Math.random() < 0.3) return { ...v, estado: 'En ruta' as const }
          if (v.aDisposicion && v.estado === 'En ruta' && Math.random() < 0.4) return { ...v, estado: 'Completado' as const }
          return v
        }),
      }))
      return {
        ...prev,
        horaDiaE: nuevaHora,
        personas: personasConVehiculos,
        actividadDiaE: [...prev.actividadDiaE, ...nuevasActividades],
      }
    })
    notify('Avance del día simulado ⏩', 'info')
  }

  const asignarPadrino = (liderId: string, padrinoId: string) => {
    setDb((prev) => ({ ...prev, padrinoLider: { ...prev.padrinoLider, [liderId]: padrinoId } }))
    notify('Padrino asignado', 'success')
  }

  const quitarRolPadrino = (padrinoId: string) => {
    setDb((prev) => {
      const padrinoLider = { ...prev.padrinoLider }
      Object.keys(padrinoLider).forEach((lid) => {
        if (padrinoLider[lid] === padrinoId) padrinoLider[lid] = ''
      })
      return {
        ...prev,
        padrinoLider,
        padrinos: prev.padrinos.map((p) => (p.id === padrinoId ? { ...p, activo: false } : p)),
      }
    })
    notify('Rol de padrino retirado', 'info')
  }

  const promoverPadrino = (personaId: string) => {
    const p = db.personas.find((x) => x.id === personaId)
    if (!p) return
    const padrinoId = uid('PAD')
    const nombre = `${p.nombres} ${p.apellidos}`
    const u = usuarioPadrino(padrinoId, nombre)
    setDb((prev) => ({
      ...prev,
      personas: prev.personas.map((x) => (x.id === personaId ? { ...x, esPadrino: true } : x)),
      padrinos: [...prev.padrinos, { id: padrinoId, nombre, cedula: p.cedula, sector: '', activo: true, personaId: p.id, userId: u.id }],
      usuarios: [...prev.usuarios, u],
    }))
    notify(`Padrino promovido · ${u.email} / padrino123`, 'success')
  }

  const nuevoPadrino = (nombre: string, cedula: string, sector: string) => {
    const padrinoId = uid('PAD')
    const u = usuarioPadrino(padrinoId, nombre)
    setDb((prev) => ({
      ...prev,
      padrinos: [...prev.padrinos, { id: padrinoId, nombre, cedula, sector, activo: true, userId: u.id }],
      usuarios: [...prev.usuarios, u],
    }))
    notify(`Padrino agregado · ${u.email} / padrino123`, 'success')
  }

  const cambiarPassword = (userId: string, nuevaPass: string) => {
    setDb((prev) => ({
      ...prev,
      usuarios: prev.usuarios.map((u) => (u.id === userId ? { ...u, pass: nuevaPass } : u)),
    }))
    notify('Contraseña actualizada', 'success')
  }

  const verPerfil = (id: string) => {
    setPerfilId(id)
    setView('perfil')
  }

  const verSimpatizanteDetalle = (id: string) => {
    setSimpatizanteDetalleId(id)
    setView('simpatizante-detalle')
  }

  const eliminarSimpatizante = async (id: string) => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) {
      notify('Inicia sesión de nuevo para continuar', 'error')
      return
    }
    try {
      const response = await fetch(`/api/simpatizantes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo eliminar la ficha.')
      notify('Ficha eliminada', 'success')
      if (simpatizanteDetalleId === id) {
        setSimpatizanteDetalleId(null)
        setView('directorio')
      }
      void cargarSimpatizantesApi()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo eliminar la ficha.', 'error')
    }
  }

  const volver = () => {
    setPerfilId(null)
    setView(session?.rol === 'admin' ? 'dashboard' : session?.rol === 'padrino' ? 'padrino-dash' : session?.rol === 'digitador' || session?.rol === 'lider' ? 'digitador' : session?.rol === 'gestor' ? 'directorio' : 'comunicaciones')
  }

  const openPersona = (m: PersonaModalState) => setPersonaModal(m)
  const closePersona = () => setPersonaModal(null)
  const openGestion = (m: GestionModalState) => setGestionModal(m)
  const closeGestion = () => setGestionModal(null)

  const savePersona = async (datos: PersonaInput) => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) {
      notify('Inicia sesión de nuevo para continuar', 'error')
      return
    }
    const payload = {
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      cedula: datos.cedula,
      fechaNacimiento: datos.fechaNacimiento,
      telefono: datos.telefono,
      correo: datos.correo || null,
      direccion: datos.direccion || null,
      departamento: datos.departamento,
      municipio: datos.municipio,
      zona: datos.zona,
      comuna: datos.comuna || null,
      corregimiento: datos.corregimiento || null,
      barrio: datos.barrio,
      puesto: datos.puesto,
      mesa: datos.mesa,
      intereses: datos.intereses,
      gruposSociales: datos.gruposSociales,
      ocupacion: datos.ocupacion || null,
      profesion: datos.profesion || null,
      nivelAcademico: datos.nivelAcademico,
      posgrado: datos.posgrado,
      observacion: datos.observacion || null,
      liderId: datos.liderId,
      planillaCodigo: datos.planillaCodigo || null,
      nivelVoto: datos.nivelVoto,
      rolDiaE: datos.rolDiaE,
      habeasData: datos.habeasData,
      vehiculos: datos.vehiculos.map((v) => ({
        tipo: v.tipo, capacidadPasajeros: v.capacidadPasajeros, aDisposicion: v.aDisposicion, estado: v.estado,
      })),
    }
    const editando = personaModal?.mode === 'edit' && personaModal.personaId
    const url = editando ? `/api/simpatizantes/${personaModal!.personaId}` : '/api/simpatizantes'
    try {
      const response = await fetch(url, {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la ficha.')
      notify(editando ? 'Ficha actualizada correctamente' : 'Simpatizante registrado 🎉', 'success')
      closePersona()
      void cargarSimpatizantesApi()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo guardar la ficha.', 'error')
    }
  }

  const saveGestion = (datos: GestionInput) => {
    setDb((prev) => {
      if (gestionModal?.mode === 'edit' && gestionModal.gestionId) {
        const gestiones = prev.gestiones.map((g) =>
          g.id === gestionModal.gestionId ? { ...g, ...datos } : g,
        )
        return { ...prev, gestiones }
      }
      const nueva: Gestion = {
        ...datos,
        id: uid('G'),
        creadoEn: new Date().toISOString(),
        creadoPor: session?.id ?? 'x',
      }
      return { ...prev, gestiones: [...prev.gestiones, nueva] }
    })
    closeGestion()
  }

  const deleteGestion = (id: string) => {
    setDb((prev) => ({ ...prev, gestiones: prev.gestiones.filter((g) => g.id !== id) }))
  }

  const toggleHabeas = (id: string) => {
    setDb((prev) => {
      const p = prev.personas.find((x) => x.id === id)
      if (!p) return prev
      const nuevoEstado = !p.habeasData
      return {
        ...prev,
        personas: prev.personas.map((x) =>
          x.id === id ? { ...x, habeasData: nuevoEstado, habeasDataFecha: new Date().toISOString() } : x,
        ),
        logsHabeas: [
          ...prev.logsHabeas,
          {
            fecha: new Date().toISOString(),
            cedula: p.cedula,
            nombre: p.nombres + ' ' + p.apellidos,
            accion: 'Cambio de autorización',
            estado: nuevoEstado ? 'Autorizado' : 'Pendiente',
            usuario: session?.nombre ?? 'Sistema',
          },
        ],
      }
    })
  }

  const enviarComunicacion = (
    canal: Canal,
    mensaje: string,
    segmento: string,
    destinatarios: number,
  ) => {
    setDb((prev) => ({
      ...prev,
      comunicaciones: [
        ...prev.comunicaciones,
        {
          id: uid('C'),
          fecha: new Date().toISOString(),
          canal,
          segmento,
          mensaje,
          destinatarios,
          usuario: session?.id ?? 'x',
        },
      ],
    }))
  }

  const resetDatos = () => {
    const fresh = generarEstado()
    setDb(fresh)
    notify('Datos de prueba restablecidos', 'success')
  }

  const borrarTodosSimpatizantes = async () => {
    const token = sessionStorage.getItem('electoral.auth.token')
    if (!token) {
      notify('Inicia sesión de nuevo para continuar', 'error')
      return
    }
    try {
      const response = await fetch('/api/simpatizantes', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo borrar en el backend.')
      notify(`Se borraron ${data.eliminados ?? 0} simpatizantes del backend`, 'success')
      void cargarSimpatizantesApi()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo borrar en el backend.', 'error')
    }
  }

  const value = useMemo<AppContextValue>(
    () => ({
      db,
      session,
      authLoading,
      authError,
      retryAuth,
      view,
      perfilId,
      personaModal,
      gestionModal,
      toast,
      login,
      logout,
      navigate,
      verPerfil,
      volver,
      openPersona,
      closePersona,
      openGestion,
      closeGestion,
      savePersona,
      saveGestion,
      deleteGestion,
      toggleHabeas,
      enviarComunicacion,
      resetDatos,
      simpatizantesApi,
      usuariosApi,
      cargarUsuariosApi,
      cargandoSimpatizantes,
      cargarSimpatizantesApi,
      cargarSimpatizanteDetalle,
      borrarTodosSimpatizantes,
      eliminarSimpatizante,
      simpatizanteDetalleId,
      verSimpatizanteDetalle,
      lideresApi,
      cargandoLideres,
      cargarLideresApi,
      crearLiderApi,
      editarLiderApi,
      eliminarLiderApi,
      padrinosApi,
      cargandoPadrinos,
      cargarPadrinosApi,
      crearPadrinoApi,
      editarPadrinoApi,
      resetClavePadrinoApi,
      gestionesApi,
      cargandoGestiones,
      cargarGestionesApi,
      crearGestionApi,
      editarGestionApi,
      eliminarGestionApi,
      actividadDiaEApi,
      cargandoActividad,
      cargarActividadApi,
      registrarVotoApi,
      cambiarRolSimpatizante,
      crearActividadApi,
      notify,
      liderFilter,
      setLiderFilter,
      directorioPreset,
      irADirectorio,
      clearDirectorioPreset,
      comunicacionesPreset,
      irAComunicaciones,
      clearComunicacionesPreset,
      gestionesPreset,
      irAGestiones,
      clearGestionesPreset,
      registrarVoto,
      simularAvance,
      asignarPadrino,
      quitarRolPadrino,
      promoverPadrino,
      nuevoPadrino,
      cambiarPassword,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, session, authLoading, authError, view, perfilId, personaModal, gestionModal, toast, liderFilter, directorioPreset, comunicacionesPreset, gestionesPreset, simpatizantesApi, usuariosApi, cargandoSimpatizantes, simpatizanteDetalleId, lideresApi, cargandoLideres, padrinosApi, cargandoPadrinos, gestionesApi, cargandoGestiones, actividadDiaEApi, cargandoActividad],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
