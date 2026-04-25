export function TopicViewerSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="h-6 bg-slate-800 rounded w-48" />
        <div className="h-8 bg-slate-800 rounded w-20" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-slate-800/50 rounded-lg p-3 border-l-4 border-slate-800">
          <div className="h-4 bg-slate-800 rounded w-full" />
        </div>
      ))}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-slate-800 rounded w-32" />
            <div className="h-3 bg-slate-800 rounded w-full" />
          </div>
        ))}
      </div>
      <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-4 space-y-2">
        <div className="h-4 bg-slate-800 rounded w-32" />
        <div className="h-3 bg-slate-800 rounded w-full" />
      </div>
    </div>
  );
}
