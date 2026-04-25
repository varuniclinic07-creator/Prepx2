'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center justify-center px-4">
        <h1 className="text-3xl font-bold text-red-400 mb-2">Critical Error</h1>
        <p className="text-slate-400 mb-6">Something went very wrong. We are looking into it.</p>
        <button
          onClick={() => reset()}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg transition"
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
