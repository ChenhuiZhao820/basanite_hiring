import { Pulse } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div>
      <Pulse className="h-3 w-32 mb-2" />
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-2">
          <Pulse className="h-7 w-64" />
          <Pulse className="h-4 w-48" />
        </div>
        <Pulse className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-4 space-y-2">
            <Pulse className="h-3 w-24" />
            <Pulse className="h-5 w-32" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <Pulse className="h-32 w-full" />
        <Pulse className="h-48 w-full" />
        <Pulse className="h-32 w-full" />
      </div>
    </div>
  )
}
