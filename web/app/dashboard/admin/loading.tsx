import { Pulse } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <Pulse className="h-3 w-32 mb-2" />
      <Pulse className="h-7 w-32 mb-1" />
      <Pulse className="h-3 w-64 mb-8" />
      <div className="border border-slate-200 dark:border-basanite-800 bg-white dark:bg-basanite-900 divide-y divide-slate-100 dark:divide-basanite-800">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="px-5 py-4 flex items-center justify-between">
            <div className="space-y-2">
              <Pulse className="h-4 w-48" />
              <Pulse className="h-3 w-32" />
            </div>
            <Pulse className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
