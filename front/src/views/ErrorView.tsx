export default function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="max-w-md text-center"><p className="mb-4 text-sm text-red-700">{message}</p>{onRetry && <button type="button" onClick={onRetry} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">Reintentar</button>}</div></main>
}
