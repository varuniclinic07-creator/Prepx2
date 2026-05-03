// Territory Conquest — squad-based district capture map.
// Sprint 4-3.

'use client';

import { useState, useEffect, useCallback } from 'react';
import ConquestMap from '@/components/3d/ConquestMap';

interface DistrictState {
  districtId: string;
  districtName: string;
  stateName: string;
  ownerSquadId: string | null;
  ownerSquadName: string | null;
  captureCount: number;
  capturedAt: string | null;
  centerLat: number;
  centerLng: number;
}

export default function ConquestPage() {
  const [districts, setDistricts] = useState<DistrictState[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchDistricts = useCallback(async () => {
    const res = await fetch('/api/conquest');
    if (res.ok) {
      const data = await res.json();
      setDistricts(data.districts || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDistricts(); }, [fetchDistricts]);

  const handleCapture = async (districtId: string) => {
    setMessage('');
    const res = await fetch('/api/conquest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ districtId }),
    });
    const data = await res.json();
    setMessage(data.message || (data.success ? 'District captured!' : 'Capture failed'));
    if (data.success) fetchDistricts();
    setTimeout(() => setMessage(''), 4000);
  };

  const capturedCount = districts.filter((d) => d.ownerSquadId).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold">Territory Conquest</h1>
            <p className="text-slate-400 text-sm mt-1">
              Capture Indian districts by mastering UPSC topics with your squad.
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-saffron-400" style={{ color: '#f59e0b' }}>
              {capturedCount}/{districts.length}
            </div>
            <div className="text-xs text-slate-500">Districts Captured</div>
          </div>
        </div>

        {message && (
          <div className={`mb-4 text-sm px-4 py-2 rounded-lg ${
            message.includes('failed') || message.includes('must')
              ? 'bg-red-900/40 text-red-300 border border-red-800'
              : 'bg-emerald-900/40 text-emerald-300 border border-emerald-800'
          }`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl h-[550px] animate-pulse flex items-center justify-center">
            <p className="text-slate-500">Loading conquest map...</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl" style={{ height: 550 }}>
            <ConquestMap
              districts={districts}
              className="w-full h-full"
              onCaptureDistrict={handleCapture}
            />
          </div>
        )}
      </div>
    </div>
  );
}
