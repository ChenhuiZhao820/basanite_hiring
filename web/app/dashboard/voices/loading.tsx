import { Pulse } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="space-y-2">
          <Pulse className="h-7 w-40" />
          <Pulse className="h-3 w-72" />
        </div>
        <Pulse className="h-9 w-32" />
      </div>
      <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 divide-y divide-earth-200 dark:divide-basanite-700">
        {[1, 2, 3].map(i => (
          <div key={i} className="px-5 py-4 flex items-center justify-between">
            <div className="space-y-2">
              <Pulse className="h-4 w-32" />
              <Pulse className="h-3 w-48" />
            </div>
            <div className="flex items-center gap-2">
              <Pulse className="h-9 w-9" />
              <Pulse className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
