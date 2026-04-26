'use client';

import { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';

const SpatialCanvas = dynamic(() => import('@/components/SpatialCanvas'), {
  ssr: false,
  loading: () => <div className="text-slate-400 text-center py-20">Loading 3D Scene…</div>,
});

export default function SpatialPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    setIsMobile(/Mobile|Android|iPhone|iPad|iPod/i.test(ua));
  }, []);

  if (isMobile) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-4 py-12">
        <h1 className="text-2xl font-bold text-slate-100">Spatial View</h1>
        <p className="text-slate-400">Spatial mode is not available on mobile devices for performance reasons.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] w-full">
      <Suspense fallback={<div className="text-slate-400 text-center py-20">Loading 3D Scene…</div>}>
        <SpatialCanvas />
      </Suspense>
    </div>
  );
}
