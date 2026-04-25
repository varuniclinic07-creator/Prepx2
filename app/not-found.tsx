import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl font-bold text-emerald-400 mb-2">404</h1>
      <h2 className="text-xl font-semibold text-slate-100 mb-2">Page not found</h2>
      <p className="text-slate-400 mb-6 max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg transition"
      >
        Back to Home
      </Link>
    </div>
  );
}
