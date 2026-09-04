import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  user: { name: string; email: string };
  slackConnected: boolean;
  onLogout: () => void;
  onMenuToggle?: () => void;
  currentPage?: string;
}

function getPageTitle(page?: string): string {
  switch (page) {
    case 'overview': return 'Overview';
    case 'campaigns': return 'Campaigns';
    case 'contacts': return 'Contacts';
    case 'analytics': return 'Analytics';
    case 'settings': return 'Settings';
    default: return 'Overview';
  }
}

export default function Header({ user, slackConnected, onLogout, onMenuToggle, currentPage }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initial = user.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-6 sm:px-8"
      style={{
        height: '64px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #D2D2D7',
      }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="p-1.5 -ml-1.5 rounded-md lg:hidden transition-colors duration-150"
          style={{
            color: '#6E6E73',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F5F5F7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <h1
          style={{
            fontSize: '17px',
            fontWeight: 600,
            color: '#1D1D1F',
          }}
        >
          {getPageTitle(currentPage)}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="hidden sm:flex items-center gap-1.5"
          style={{
            fontSize: '11px',
            color: '#86868B',
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: '6px',
              height: '6px',
              backgroundColor: slackConnected ? '#248A3D' : '#AEAEB2',
            }}
          />
          Slack
        </div>

        <div
          className="hidden sm:block"
          style={{
            width: '1px',
            height: '16px',
            backgroundColor: '#E8E8ED',
          }}
        />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-md transition-colors duration-150"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F5F5F7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#5856D6',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              {initial}
            </div>
            <span
              className="hidden sm:block"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#1D1D1F',
              }}
            >
              {user.name}
            </span>
            <ChevronDown
              size={12}
              style={{
                color: '#86868B',
                transition: 'transform 150ms',
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 z-50"
              style={{
                marginTop: '6px',
                width: '208px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E8E8ED',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                padding: '4px 0',
                animation: 'fadeIn 150ms ease-out',
              }}
            >
              <div
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #E8E8ED',
                }}
              >
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#1D1D1F' }}>{user.name}</p>
                <p style={{ fontSize: '11px', color: '#86868B', marginTop: '2px' }}>{user.email}</p>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                }}
                className="flex items-center gap-2 w-full transition-colors"
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#6E6E73',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F5F5F7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <UserIcon size={14} />
                Profile
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onLogout();
                }}
                className="flex items-center gap-2 w-full transition-colors"
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#C93434',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FDF2F2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
