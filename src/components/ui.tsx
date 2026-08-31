import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { EstadoGestion, NivelAcademico, NivelVoto, TipoVehiculo, Validez } from '../types'
import { useApp } from '../store'

export const inputCls =
  'w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${className}`}>
      {children}
    </span>
  )
}

export function Kpi({
  icon: Icon,
  label,
  value,
  accent = 'text-slate-800',
}: {
  icon: LucideIcon
  label: string
  value: string | number
  accent?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className={`text-2xl font-extrabold ${accent}`}>{value}</div>
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <div className="text-[11px] text-slate-500 font-medium mt-1">{label}</div>
    </div>
  )
}

export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="font-bold text-sm text-slate-800">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

export function ProgressBar({ pct, color = 'bg-blue-600' }: { pct: number; color?: string }) {
  return (
    <div className="w-full bg-slate-200 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full ${color} transition-all`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  )
}

export function Bars({
  data,
  height = 150,
}: {
  data: { label: string; value: number; color: string }[]
  height?: number
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-3 h-52">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <div className="text-xs font-semibold text-slate-600">{d.value}</div>
          <div
            className="w-full max-w-[60px] rounded-t-md transition-all"
            style={{ height: `${(d.value / max) * height}px`, backgroundColor: d.color }}
          />
          <div className="text-[10px] text-slate-500 truncate w-full text-center">{d.label}</div>
        </div>
      ))}
    </div>
  )
}

export function Donut({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = 40
  const C = 2 * Math.PI * r
  let acc = 0
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const frac = d.value / total
      const seg = { ...d, frac, offset: acc * C }
      acc += frac
      return seg
    })
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="16" />
      {segments.map((s, i) => (
        <circle
          key={i}
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth="16"
          strokeDasharray={`${s.frac * C} ${C}`}
          strokeDashoffset={-s.offset}
          transform="rotate(-90 50 50)"
        />
      ))}
    </svg>
  )
}

export function Legend({ data }: { data: { label: string; value: number; color: string }[] }) {
  return (
    <div className="space-y-1.5 mt-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
          <span className="text-slate-600 flex-1">{d.label}</span>
          <span className="font-semibold text-slate-800">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

export function GroupedBars({
  groups,
  series,
  height = 150,
}: {
  groups: string[]
  series: { label: string; color: string; values: number[] }[]
  height?: number
}) {
  const max = Math.max(...series.flatMap((s) => s.values), 1)
  return (
    <div>
      <div className="flex items-end gap-3 h-52">
        {groups.map((g, gi) => (
          <div key={g} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
            <div className="flex items-end gap-1">
              {series.map((s) => (
                <div
                  key={s.label}
                  title={`${g} · ${s.label}: ${s.values[gi]}`}
                  className="w-4 rounded-t-sm transition-all"
                  style={{ height: `${(s.values[gi] / max) * height}px`, backgroundColor: s.color }}
                />
              ))}
            </div>
            <div className="text-[10px] text-slate-500 truncate w-full text-center">{g}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function Field({
  label,
  required,
  children,
  className = '',
}: {
  label: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <span className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto fade-in`}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="font-bold text-lg text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function ToastView() {
  const { toast } = useApp()
  if (!toast) return null
  const colors: Record<string, string> = {
    success: 'bg-emerald-600',
    info: 'bg-slate-800',
    error: 'bg-red-600',
    warn: 'bg-amber-500',
  }
  return (
    <div className="fixed bottom-5 right-5 z-[100]">
      <div className={`${colors[toast.type] || colors.info} text-white text-sm px-4 py-3 rounded-xl shadow-2xl fade-in`}>
        {toast.msg}
      </div>
    </div>
  )
}

/* ---- Tonalidades de badges (clases estáticas para Tailwind) ---- */

export function nivelTone(nv: NivelVoto): string {
  return nv === 'Firme'
    ? 'bg-emerald-100 text-emerald-700'
    : nv === 'Indeciso'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700'
}

export function estadoTone(es: EstadoGestion): string {
  return es === 'Resuelto'
    ? 'bg-emerald-100 text-emerald-700'
    : es === 'En Proceso'
      ? 'bg-amber-100 text-amber-700'
      : es === 'Pendiente'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-slate-200 text-slate-600'
}

export function vehiculoTone(tipo: TipoVehiculo): string {
  return tipo === 'Bus'
    ? 'bg-purple-100 text-purple-700'
    : tipo === 'Camioneta'
      ? 'bg-sky-100 text-sky-700'
      : tipo === 'Automóvil'
        ? 'bg-indigo-100 text-indigo-700'
        : 'bg-teal-100 text-teal-700'
}

export function validezTone(v: Validez): string {
  return v === 'valido'
    ? 'bg-emerald-100 text-emerald-700'
    : v === 'fuera_municipio'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700'
}

export const validezLabel = (v: Validez): string =>
  v === 'valido' ? 'Válido' : v === 'fuera_municipio' ? 'Fuera de municipio' : 'Fuera de departamento'

export function nivelAcademicoTone(n: NivelAcademico): string {
  return n === 'Profesional' || n === 'Tecnólogo'
    ? 'bg-blue-100 text-blue-700'
    : n === 'Técnico'
      ? 'bg-teal-100 text-teal-700'
      : n === 'Bachiller'
        ? 'bg-slate-200 text-slate-700'
        : n === 'Primaria'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-200 text-slate-500'
}
