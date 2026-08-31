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
  Canal,
  DB,
  Gestion,
  GestionInput,
  Persona,
  PersonaInput,
  Usuario,
} from './types'
import { generarEstado, LS_KEY, USUARIOS, esValido, getPersona } from './data'
import { hoyISO, uid } from './lib'

export type ViewId =
  | 'dashboard'
  | 'lideres'
  | 'gestiones'
  | 'comunicaciones'
  | 'logistica'
  | 'censo'
  | 'directorio'
  | 'talento'
  | 'legal'
  | 'perfil'
  | 'lider-dash'
  | 'captura'
  | 'lider-simpatizantes'
  | 'lider-gestiones'

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
}

interface AppContextValue {
  db: DB
  session: Usuario | null
  view: ViewId
  perfilId: string | null
  personaModal: PersonaModalState | null
  gestionModal: GestionModalState | null
  toast: { msg: string; type: ToastType } | null
  login: (userId: string) => void
  logout: () => void
  navigate: (v: ViewId) => void
  verPerfil: (id: string) => void
  volver: () => void
  openPersona: (m: PersonaModalState) => void
  closePersona: () => void
  openGestion: (m: GestionModalState) => void
  closeGestion: () => void
  savePersona: (datos: PersonaInput) => void
  saveGestion: (datos: GestionInput) => void
  deleteGestion: (id: string) => void
  toggleHabeas: (id: string) => void
  enviarComunicacion: (canal: Canal, mensaje: string, segmento: string, destinatarios: number) => void
  resetDatos: () => void
  notify: (msg: string, type?: ToastType) => void
  liderFilter: string
  setLiderFilter: (v: string) => void
  directorioPreset: DirectorioPreset | null
  irADirectorio: (preset: DirectorioPreset) => void
  clearDirectorioPreset: () => void
  registrarVoto: (id: string) => void
  simularAvance: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as DB
  } catch {
    /* ignore */
  }
  return generarEstado()
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => loadDB())
  const [session, setSession] = useState<Usuario | null>(null)
  const [view, setView] = useState<ViewId>('dashboard')
  const [perfilId, setPerfilId] = useState<string | null>(null)
  const [personaModal, setPersonaModal] = useState<PersonaModalState | null>(null)
  const [gestionModal, setGestionModal] = useState<GestionModalState | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null)
  const toastTimer = useRef<number | null>(null)
  const [liderFilter, setLiderFilter] = useState<string>('all')
  const [directorioPreset, setDirectorioPreset] = useState<DirectorioPreset | null>(null)

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

  const login = (userId: string) => {
    const u = USUARIOS.find((x) => x.id === userId)
    if (!u) return
    setSession(u)
    setPerfilId(null)
    setView(u.rol === 'admin' ? 'dashboard' : 'lider-dash')
    notify(`Bienvenido, ${u.nombre}`, 'success')
  }

  const logout = () => {
    setSession(null)
    setPerfilId(null)
    notify('Sesión cerrada', 'info')
  }

  const navigate = (v: ViewId) => {
    if (v !== 'perfil') setPerfilId(null)
    setView(v)
  }

  const irADirectorio = (preset: DirectorioPreset) => {
    if (preset.liderId) setLiderFilter(preset.liderId)
    setDirectorioPreset(preset)
    setPerfilId(null)
    setView('directorio')
  }

  const clearDirectorioPreset = () => setDirectorioPreset(null)

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
        { id: uid('A'), hora: prev.horaDiaE, liderId: p.liderId, tipo: 'Voto', detalle: `Registró el voto de ${p.nombres} ${p.apellidos}` },
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
        porLider[p.liderId] = (porLider[p.liderId] || 0) + 1
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

  const verPerfil = (id: string) => {
    setPerfilId(id)
    setView('perfil')
  }

  const volver = () => {
    setPerfilId(null)
    setView(session?.rol === 'admin' ? 'dashboard' : 'lider-dash')
  }

  const openPersona = (m: PersonaModalState) => setPersonaModal(m)
  const closePersona = () => setPersonaModal(null)
  const openGestion = (m: GestionModalState) => setGestionModal(m)
  const closeGestion = () => setGestionModal(null)

  const savePersona = (datos: PersonaInput) => {
    setDb((prev) => {
      if (personaModal?.mode === 'edit' && personaModal.personaId) {
        const id = personaModal.personaId
        const anterior = prev.personas.find((p) => p.id === id)
        const personas = prev.personas.map((p) => (p.id === id ? { ...p, ...datos } : p))
        const logsHabeas =
          anterior && anterior.habeasData !== datos.habeasData
            ? [
                ...prev.logsHabeas,
                {
                  fecha: new Date().toISOString(),
                  cedula: datos.cedula,
                  nombre: datos.nombres + ' ' + datos.apellidos,
                  accion: 'Cambio de autorización',
                  estado: datos.habeasData ? 'Autorizado' : 'Pendiente',
                  usuario: session?.nombre ?? 'Sistema',
                },
              ]
            : prev.logsHabeas
        return { ...prev, personas, logsHabeas }
      }
      const nueva: Persona = {
        ...datos,
        id: uid('S'),
        esLider: false,
        votoRegistrado: false,
        votoHora: '',
        habeasDataFecha: hoyISO(),
        creadoEn: new Date().toISOString(),
        creadoPor: session?.id ?? 'x',
      }
      return {
        ...prev,
        personas: [...prev.personas, nueva],
        logsHabeas: [
          ...prev.logsHabeas,
          {
            fecha: new Date().toISOString(),
            cedula: nueva.cedula,
            nombre: nueva.nombres + ' ' + nueva.apellidos,
            accion: 'Autorización registrada',
            estado: nueva.habeasData ? 'Autorizado' : 'Pendiente',
            usuario: session?.nombre ?? 'Sistema',
          },
        ],
      }
    })
    closePersona()
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

  const value = useMemo<AppContextValue>(
    () => ({
      db,
      session,
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
      notify,
      liderFilter,
      setLiderFilter,
      directorioPreset,
      irADirectorio,
      clearDirectorioPreset,
      registrarVoto,
      simularAvance,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, session, view, perfilId, personaModal, gestionModal, toast, liderFilter, directorioPreset],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
