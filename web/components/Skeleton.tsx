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

export function PageHeaderSkeleton({ width = 'w-40' }: { width?: string }) {
  return (
    <div className="mb-8">
      <Pulse className="h-3 w-32 mb-3" />
      <Pulse className={`h-7 ${width} mb-1`} />
      <Pulse className="h-3 w-72" />
    </div>
  )
}

export function IntegrationsSkeleton() {
  return (
    <div className="max-w-4xl">
      <PageHeaderSkeleton width="w-32" />
      <div className="bg-white border border-slate-200 p-6 mb-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Pulse className="h-4 w-48" />
            <Pulse className="h-3 w-64" />
          </div>
          <Pulse className="h-8 w-28" />
        </div>
      </div>
      <div className="bg-white border border-slate-200 p-6 space-y-3">
        <Pulse className="h-4 w-56" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center justify-between border-b border-slate-100 py-3">
            <div className="space-y-2">
              <Pulse className="h-4 w-64" />
              <Pulse className="h-3 w-32" />
            </div>
            <Pulse className="h-7 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function RoleDetailSkeleton() {
  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-2">
          <Pulse className="h-3 w-32" />
          <Pulse className="h-7 w-72" />
          <Pulse className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Pulse className="h-6 w-14" />
          <Pulse className="h-8 w-8" />
        </div>
      </div>
      <div className="border border-earth-200 bg-white p-5 mb-8 space-y-2">
        <Pulse className="h-3 w-32" />
        <Pulse className="h-9 w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-earth-200 bg-white p-4 space-y-2">
            <Pulse className="h-3 w-24" />
            <Pulse className="h-4 w-32" />
          </div>
        ))}
      </div>
      <Pulse className="h-5 w-40 mb-4" />
      <div className="border border-earth-200 bg-white divide-y divide-earth-200">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="px-5 py-4 grid grid-cols-12 gap-4">
            <div className="col-span-3 space-y-1.5">
              <Pulse className="h-4 w-32" />
              <Pulse className="h-3 w-40" />
            </div>
            <div className="col-span-2"><Pulse className="h-3 w-20" /></div>
            <div className="col-span-4 flex gap-1"><Pulse className="h-5 w-full" /></div>
            <div className="col-span-1"><Pulse className="h-4 w-8" /></div>
            <div className="col-span-2"><Pulse className="h-3 w-16" /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="max-w-2xl mx-auto">
      <Pulse className="h-3 w-32 mb-4" />
      <div className="flex items-center gap-3 mb-8">
        <Pulse className="h-8 w-8 rounded-full" />
        <Pulse className="h-4 w-32" />
        <Pulse className="h-px w-12" />
        <Pulse className="h-8 w-8 rounded-full" />
        <Pulse className="h-4 w-40" />
      </div>
      <Pulse className="h-7 w-56 mb-2" />
      <Pulse className="h-4 w-96 mb-8" />
      <div className="space-y-5">
        <Pulse className="h-10 w-full" />
        <Pulse className="h-10 w-full" />
        <Pulse className="h-32 w-full" />
        <Pulse className="h-10 w-32 ml-auto" />
      </div>
    </div>
  )
}
