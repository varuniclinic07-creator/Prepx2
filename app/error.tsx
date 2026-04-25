'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h2 className="text-2xl font-bold text-slate-100 mb-2">Something went wrong</h2>
      <p className="text-slate-400 mb-6 max-w-md">
        We encountered an unexpected error. Please try again or contact support if the issue persists.
      </p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => reset()}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg transition"
        >
          Try Again
        </button>
        <a
          href="mailto:support@prepx.in"
          className="px-5 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg transition"
        >
          Contact Support
        </a>
      </div>
      {error.digest && <p className="mt-4 text-xs text-slate-600">Error ID: {error.digest}</p>}
    </div>
  );
}
