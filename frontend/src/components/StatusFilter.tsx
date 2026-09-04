'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface StatusFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const options = [
  { value: 'all', label: 'All', dot: 'bg-[#86868B]' },
  { value: 'scheduled', label: 'Scheduled', dot: 'bg-[#B86E00]' },
  { value: 'processing', label: 'Processing', dot: 'bg-[#5856D6]' },
  { value: 'sent', label: 'Sent', dot: 'bg-[#248A3D]' },
  { value: 'failed', label: 'Failed', dot: 'bg-[#C93434]' },
];

export default function StatusFilter({ value, onChange }: StatusFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref} style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 h-8 px-2.5 rounded-md border border-[#E8E8ED] bg-white text-[12px] text-[#6E6E73] hover:bg-gray-50 transition-colors"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${selected.dot}`} />
        <span>{selected.label}</span>
        <ChevronDown size={12} className={`text-[#86868B] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-40 bg-white rounded-lg border border-[#E8E8ED] shadow-dropdown py-1 z-50">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-[12px] transition-colors ${
                value === opt.value
                  ? 'bg-[#F0EFFF] text-[#5856D6]'
                  : 'text-[#6E6E73] hover:bg-gray-50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
