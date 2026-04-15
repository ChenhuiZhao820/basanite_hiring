import { Pulse } from '@/components/Skeleton'

export default function AccountLoading() {
  return (
    <div className="max-w-xl">
      <div className="mb-8 space-y-2">
        <Pulse className="h-4 w-20" />
        <Pulse className="h-7 w-32" />
        <Pulse className="h-4 w-64" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-slate-200 p-6 space-y-4">
            <Pulse className="h-4 w-28" />
            <div className="space-y-2">
              <Pulse className="h-3 w-20" />
              <Pulse className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Pulse className="h-3 w-24" />
              <Pulse className="h-9 w-full" />
            </div>
            <Pulse className="h-9 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}
