export default function LoadingView({ message = 'Cargando…' }: { message?: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="text-center" role="status"><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" /><p className="text-sm text-slate-600">{message}</p></div></main>
}
