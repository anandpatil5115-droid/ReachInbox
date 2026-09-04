import React from 'react';
import {
  LayoutDashboard,
  Mail,
  Users,
  BarChart3,
  Settings,
  Send,
  X,
} from 'lucide-react';

interface SidebarProps {
  user: { name: string; email: string };
  currentPath: string;
  onNavigate: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const mainItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'campaigns', label: 'Campaigns', icon: Mail },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const bottomItems: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings },
];

function NavList({
  items,
  currentPath,
  onNavigate,
}: {
  items: NavItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentPath === item.id;
        return (
          <li key={item.id}>
            <button
              onClick={() => onNavigate(item.id)}
              className="flex items-center w-full gap-2.5 px-3 py-2 rounded-lg transition-colors duration-150"
              style={{
                backgroundColor: isActive ? '#F0EFFE' : 'transparent',
                color: isActive ? '#5856D6' : '#6E6E73',
                fontSize: '13px',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#F5F5F7';
                  e.currentTarget.style.color = '#1D1D1F';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6E6E73';
                }
              }}
            >
              <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
              {item.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function Sidebar({ user, currentPath, onNavigate, isOpen, onClose }: SidebarProps) {
  const initial = user.name?.charAt(0)?.toUpperCase() || 'U';

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Brand */}
      <div
        className="flex items-center justify-between px-5"
        style={{
          height: '64px',
          borderBottom: '1px solid #E8E8ED',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              width: '28px',
              height: '28px',
              backgroundColor: '#5856D6',
            }}
          >
            <Send size={13} style={{ color: '#FFFFFF' }} strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#1D1D1F',
              letterSpacing: '-0.01em',
            }}
          >
            ReachInbox
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md lg:hidden transition-colors duration-150"
          style={{
            color: '#86868B',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F5F5F7';
            e.currentTarget.style.color = '#1D1D1F';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#86868B';
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <NavList items={mainItems} currentPath={currentPath} onNavigate={onNavigate} />
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-3 space-y-0.5">
        <NavList items={bottomItems} currentPath={currentPath} onNavigate={onNavigate} />
      </div>

      {/* User */}
      <div
        className="px-3 py-3"
        style={{
          borderTop: '1px solid #E8E8ED',
        }}
      >
        <div className="flex items-center gap-2.5 px-2">
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
          <div className="flex-1 min-w-0">
            <p
              className="truncate"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#1D1D1F',
              }}
            >
              {user.name}
            </p>
            <p
              className="truncate"
              style={{
                fontSize: '11px',
                color: '#86868B',
              }}
            >
              {user.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex-col"
        style={{
          width: '240px',
          borderRight: '1px solid #E8E8ED',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="fixed inset-0 transition-opacity duration-200"
            style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
            onClick={onClose}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out"
            style={{ width: '240px' }}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
