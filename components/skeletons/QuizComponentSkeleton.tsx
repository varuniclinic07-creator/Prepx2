export function QuizComponentSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="h-6 bg-slate-800 rounded w-8" />
            <div className="h-4 bg-slate-800 rounded w-3/4" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-10 bg-slate-800 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
