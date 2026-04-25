export function DailyPlanSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 bg-slate-800 rounded w-32" />
        <div className="h-4 bg-slate-800 rounded w-20" />
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/40 border border-slate-800">
            <div className="w-6 h-6 rounded-full bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-800 rounded w-32" />
              <div className="h-3 bg-slate-800 rounded w-16" />
            </div>
            <div className="h-6 bg-slate-800 rounded-full w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
