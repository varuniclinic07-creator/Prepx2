'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { TrendingUp } from 'lucide-react';

export default function MasteryTrajectory({ data }: { data: { day: string; score: number }[] }) {
  return (
    <GlassCard glow="cyan" padding="md">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp size={16} className="text-cyan-400" />
        <div>
          <h2 className="text-sm font-semibold text-white">Mastery Trajectory</h2>
          <p className="text-[11px] text-white/40">7-day quiz score trend</p>
        </div>
      </div>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -32, bottom: 0 }}>
            <defs>
              <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={false} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
              itemStyle={{ color: '#22d3ee' }}
              formatter={(value) => [`${value}%`, 'Score']}
            />
            <Area type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2} fill="url(#cyanGradient)" dot={false} activeDot={{ r: 4, fill: '#22d3ee' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
