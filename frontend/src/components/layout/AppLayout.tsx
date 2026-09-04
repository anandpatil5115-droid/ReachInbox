import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface User {
  name: string;
  email: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  user: User;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export default function AppLayout({
  children,
  user,
  currentPage,
  onNavigate,
  onLogout,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F7' }}>
      <Sidebar
        user={user}
        currentPath={currentPage}
        onNavigate={(path) => {
          onNavigate(path);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-[240px]">
        <Header
          user={user}
          slackConnected={true}
          onLogout={onLogout}
          onMenuToggle={() => setSidebarOpen(true)}
          currentPage={currentPage}
        />

        <main className="px-6 py-8 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
