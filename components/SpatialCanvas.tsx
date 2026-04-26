'use client';

import { useEffect, useRef, useState } from 'react';

export default function SpatialCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(() => {
    fetch('/api/spatial/topics').then(r => r.json()).then(d => {
      setTopics(d.topics || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setCurrent(c => Math.min(c + 1, topics.length - 1));
      if (e.key === 'ArrowLeft') setCurrent(c => Math.max(c - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [topics.length]);

  useEffect(() => {
    let canvas: any;
    let renderer: any;
    let frameId: number;

    async function init() {
      if (!containerRef.current) return;
      const THREE = await import('three');
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerRef.current.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f172a);
      const camera = new THREE.PerspectiveCamera(60, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 100);
      camera.position.set(0, 2, 6);

      // Floating cards
      const cards: any[] = [];
      topics.forEach((t, i) => {
        const geo = new THREE.PlaneGeometry(2, 1.2);
        const mat = new THREE.MeshBasicMaterial({ color: i === current ? 0x10b981 : 0x1e293b, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((i - current) * 3, 0, Math.abs(i - current) * -1.5);
        scene.add(mesh);
        cards.push(mesh);
      });

      // Simple coach sphere in top-right
      const coachGeo = new THREE.SphereGeometry(0.15, 32, 32);
      const coachMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
      const coach = new THREE.Mesh(coachGeo, coachMat);
      coach.position.set(3, 2.5, -2);
      scene.add(coach);

      function animate() {
        frameId = requestAnimationFrame(animate);
        cards.forEach((mesh, i) => {
          const targetX = (i - current) * 3;
          const targetZ = Math.abs(i - current) * -1.5;
          mesh.position.x += (targetX - mesh.position.x) * 0.08;
          mesh.position.z += (targetZ - mesh.position.z) * 0.08;
          (mesh.material as any).color.setHex(i === current ? 0x10b981 : 0x1e293b);
        });
        coach.rotation.y += 0.02;
        renderer.render(scene, camera);
      }
      animate();
    }

    init().catch(() => {});

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (renderer && containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
        renderer.dispose();
      }
    };
  }, [topics, current]);

  if (loading) return <div className="text-slate-400 text-center py-20">Loading topics…</div>;

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      {/* HTML overlay: top bar title */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h2 className="text-lg font-bold text-white bg-slate-900/60 px-3 py-1 rounded-lg">{topics[current]?.title || ''}</h2>
      </div>
      {/* HTML overlay: notes panel */}
      {notesOpen && topics[current] && (
        <div className="absolute right-4 top-16 z-20 w-80 bg-slate-900/90 backdrop-blur rounded-xl border border-slate-800 p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-200">Notes</h3>
            <button onClick={() => setNotesOpen(false)} className="text-xs text-slate-400 hover:text-slate-200">✕</button>
          </div>
          <p className="text-xs text-slate-400 line-clamp-10">{topics[current].content?.summary || 'No summary available.'}</p>
        </div>
      )}
      {/* HTML overlay: controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
        <button onClick={() => setCurrent(c => Math.max(c - 1, 0))} className="px-3 py-1.5 rounded-lg bg-slate-900/80 text-slate-200 text-sm hover:bg-slate-800 border border-slate-700">← Prev</button>
        <button onClick={() => setNotesOpen(o => !o)} className="px-3 py-1.5 rounded-lg bg-slate-900/80 text-slate-200 text-sm hover:bg-slate-800 border border-slate-700">{notesOpen ? 'Hide Notes' : 'Show Notes'}</button>
        <button onClick={() => setCurrent(c => Math.min(c + 1, topics.length - 1))} className="px-3 py-1.5 rounded-lg bg-slate-900/80 text-slate-200 text-sm hover:bg-slate-800 border border-slate-700">Next →</button>
      </div>
    </div>
  );
}
