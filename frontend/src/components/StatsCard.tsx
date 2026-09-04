'use client';

import React from 'react';

type CardColor = 'indigo' | 'green' | 'blue' | 'amber';

interface StatsCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: CardColor;
  trend?: string;
}

export default function StatsCard({ icon, value, label, color, trend }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[#D2D2D7] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-[#86868B]">{icon}</div>
          <div>
            <p className="text-[20px] font-semibold text-[#1D1D1F] tracking-tight" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
              {value}
            </p>
            <p className="text-[12px] text-[#86868B] mt-0.5">{label}</p>
          </div>
        </div>
        {trend && (
          <span className="text-[11px] font-medium text-[#248A3D] bg-[#EAF9F1] px-2 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
