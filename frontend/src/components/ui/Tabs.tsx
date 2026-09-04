import React from 'react';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`border-b border-[#E8E8ED] ${className}`}>
      <nav className="flex gap-0 -mb-px" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                relative px-3 py-2.5 text-[13px] font-medium whitespace-nowrap
                transition-colors
                ${
                  isActive
                    ? 'text-[#1D1D1F]'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }
              `}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`
                      inline-flex items-center justify-center
                      min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-medium
                      ${
                        isActive
                          ? 'bg-[#F0EFFE] text-[#5856D6]'
                          : 'bg-[#F5F5F7] text-[#86868B]'
                      }
                    `}
                  >
                    {tab.count}
                  </span>
                )}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5856D6] rounded-t-full" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
