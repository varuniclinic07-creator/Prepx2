'use client';

import { motion } from 'motion/react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { useT } from '@/lib/i18n-client';

export interface WeakAreaPoint {
  subject: string;
  severity: number;
}

export function WeakAreaRadar({ data }: { data: WeakAreaPoint[] }) {
  const { t } = useT();

  if (!data.length) {
    return (
      <div className="flex h-full min-h-[260px] items-center justify-center px-4 py-10 text-center">
        <p className="max-w-xs text-sm text-white/55">{t('dashboard.cards.weak.empty')}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="h-72 w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
          />
          <Radar
            dataKey="severity"
            stroke="#8B5CF6"
            strokeWidth={2}
            fill="url(#weakGradient)"
            fillOpacity={0.65}
          />
          <defs>
            <linearGradient id="weakGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#2B59F0" stopOpacity={0.15} />
            </linearGradient>
          </defs>
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
