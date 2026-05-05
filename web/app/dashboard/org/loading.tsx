import { Pulse } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Pulse className="h-7 w-48 mb-2" />
        <Pulse className="h-3 w-32" />
      </div>
      <div className="space-y-3">
        <Pulse className="h-5 w-24" />
        <Pulse className="h-10 w-full" />
        <Pulse className="h-10 w-full" />
        <Pulse className="h-10 w-72" />
      </div>
      <div className="space-y-3">
        <Pulse className="h-5 w-24" />
        <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 divide-y divide-earth-200 dark:divide-basanite-700">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-5 py-4 flex items-center justify-between">
              <div className="space-y-1.5">
                <Pulse className="h-4 w-40" />
                <Pulse className="h-3 w-56" />
              </div>
              <Pulse className="h-7 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
