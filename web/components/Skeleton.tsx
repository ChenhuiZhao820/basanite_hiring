export function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-earth-200 ${className}`} />
}

export function DashboardSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <Pulse className="h-7 w-32" />
        <Pulse className="h-9 w-28" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white border border-earth-200 p-5 space-y-2">
            <Pulse className="h-3 w-24" />
            <Pulse className="h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-earth-200 bg-white p-6 space-y-3">
            <Pulse className="h-5 w-40" />
            <Pulse className="h-3 w-24" />
            <Pulse className="h-3 w-56" />
          </div>
        ))}
      </div>
    </div>
  )
}
