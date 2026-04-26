'use client';

import { useState, useEffect, useCallback } from 'react';

interface District {
  id: string;
  name: string;
  state: string;
  center_lat: number;
  center_lng: number;
  owner_squad: string | null;
  owner_squad_id: string | null;
  capture_count: number;
  topic: string | null;
}

const SQUAD_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

function getSquadColor(squadName: string | null): string {
  if (!squadName) return 'rgba(51,65,85,0.6)'; // slate-700
  let hash = 0;
  for (let i = 0; i < squadName.length; i++) hash = squadName.charCodeAt(i) + ((hash << 5) - hash);
  return SQUAD_COLORS[Math.abs(hash) % SQUAD_COLORS.length];
}

// Simplified state coordinates (lat, lng pairs) for MVP SVG
const STATE_COORDS: Record<string, [number, number][]> = {
  'Andhra Pradesh': [[78,17],[80,17],[81,16],[80,15],[79,14],[78,14],[77,15],[76,16],[77,17]],
  'Arunachal Pradesh': [[93,28],[95,29],[96,28],[95,27],[94,27]],
  'Assam': [[89,26],[91,26],[93,25],[92,24],[91,24],[90,25],[89,26]],
  'Bihar': [[84,27],[86,27],[87,26],[87,25],[85,25],[84,26]],
  'Chhattisgarh': [[81,23],[83,23],[83,21],[82,20],[81,21],[80,22]],
  'Goa': [[73,15.5],[74,15.5],[74,15],[73,15]],
  'Gujarat': [[68,24],[72,24],[73,23],[73,20],[70,20],[68,22]],
  'Haryana': [[74,30],[77,30],[78,29],[77,28],[75,28],[74,29]],
  'Himachal Pradesh': [[75,33],[78,33],[79,32],[78,31],[76,31],[75,32]],
  'Jharkhand': [[84,25],[86,25],[87,24],[86,22],[85,22],[84,23]],
  'Karnataka': [[74,16],[77,16],[78,15],[77,13],[76,12],[75,13],[74,14]],
  'Kerala': [[74,12],[77,12],[78,11],[77,10],[76,10],[75,11]],
  'Madhya Pradesh': [[74,25],[80,25],[82,23],[82,21],[78,21],[74,23]],
  'Maharashtra': [[72,22],[77,22],[80,19],[80,17],[77,16],[73,17],[72,20]],
  'Manipur': [[93,25],[94,25],[94,24],[93,24]],
  'Meghalaya': [[89,26],[91,26],[92,25],[90,25]],
  'Mizoram': [[92,24],[93,24],[93,22],[92,22]],
  'Nagaland': [[93,26],[95,26],[95,25],[93,25]],
  'Odisha': [[81,22],[87,22],[87,19],[86,19],[84,20],[82,20],[81,21]],
  'Punjab': [[73,32],[77,32],[77,30],[75,30],[73,31]],
  'Rajasthan': [[69,30],[78,30],[78,26],[75,24],[73,25],[70,26],[69,28]],
  'Sikkim': [[88,28],[89,28],[89,27],[88,27]],
  'Tamil Nadu': [[77,13],[79,13],[80,11],[79,9],[78,8],[77,9],[76,11]],
  'Telangana': [[77,19],[81,19],[81,17],[79,16],[77,17]],
  'Tripura': [[91,24],[92,24],[92,23],[91,23]],
  'Uttar Pradesh': [[77,30],[84,30],[84,26],[83,25],[80,25],[77,27]],
  'Uttarakhand': [[77,31],[80,31],[81,30],[80,29],[78,29],[77,30]],
  'West Bengal': [[85,27],[89,27],[89,23],[88,22],[86,22],[85,24]],
};

export default function TerritoryPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<District | null>(null);
  const [hovered, setHovered] = useState<District | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadDistricts();
  }, []);

  async function loadDistricts() {
    setLoading(true);
    try {
      const res = await fetch('/api/territory/list', { method: 'POST' });
      const data = await res.json();
      setDistricts(data.districts || []);
    } catch (e) { setMessage('Failed to load territory map'); }
    setLoading(false);
  }

  async function capture(district: District) {
    try {
      const res = await fetch('/api/territory/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ district_id: district.id }),
      });
      const data = await res.json();
      setMessage(data.message || data.error);
      if (data.success) loadDistricts();
    } catch (e) { setMessage('Capture failed'); }
  }

  const svgWidth = 800;
  const svgHeight = 600;
  const minLng = 68;
  const maxLng = 97;
  const minLat = 8;
  const maxLat = 37;

  const toSvg = (coords: [number, number][]): string => {
    return coords.map(([lng, lat]) => {
      const x = ((lng - minLng) / (maxLng - minLng)) * svgWidth;
      const y = svgHeight - ((lat - minLat) / (maxLat - minLat)) * svgHeight;
      return `${x},${y}`;
    }).join(' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Bharat Ka Vijay</h1>
        <span className="text-xs text-slate-400 uppercase tracking-wider">Territory Conquest</span>
      </div>

      {message && (
        <div className={`text-sm px-4 py-2 rounded-lg ${message.includes('success') || message.includes('captured') ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="h-96 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400">Loading map...</div>
      ) : (
        <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[600px]">
            {districts.map((d) => {
              const coords = STATE_COORDS[d.name];
              if (!coords) return null;
              const color = getSquadColor(d.owner_squad);
              return (
                <g key={d.id}>
                  <polygon
                    points={toSvg(coords)}
                    fill={color}
                    stroke="rgba(51,65,85,0.8)"
                    strokeWidth={1}
                    className="cursor-pointer transition hover:opacity-80"
                    onClick={() => setSelected(d)}
                    onMouseEnter={() => setHovered(d)}
                    onMouseLeave={() => setHovered(null)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {hovered && (
            <div className="absolute top-4 right-4 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm max-w-xs">
              <p className="font-bold text-slate-100">{hovered.name}</p>
              <p className="text-slate-400">State: {hovered.state}</p>
              <p className={`${hovered.owner_squad ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hovered.owner_squad ? `🏴 Owned by ${hovered.owner_squad}` : 'Unclaimed'}
              </p>
              <p className="text-slate-500 mt-1">Captures: {hovered.capture_count}</p>
            </div>
          )}
        </div>
      )}

      {/* Selected state actions */}
      {selected && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-slate-100 mb-2">{selected.name}</h3>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400">
              Owner: <span className={selected.owner_squad ? 'text-emerald-400' : 'text-slate-500'}>{selected.owner_squad || 'Unclaimed'}</span>
            </div>
            <div className="text-sm text-slate-400">Captures: {selected.capture_count}</div>
          </div>
          <button
            onClick={() => capture(selected)}
            disabled={!!selected.owner_squad}
            className="mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
          >
            {selected.owner_squad ? '🔒 Already Owned' : '🏳️ Capture for Squad'}
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-4">
        <span className="text-xs text-slate-400 flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-slate-700 inline-block" /> Unclaimed</span>
        {SQUAD_COLORS.map(c => (
          <span key={c} className="text-xs text-slate-400 flex items-center gap-2"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: c }} /> Squad Territory</span>
        ))}
      </div>
    </div>
  );
}
