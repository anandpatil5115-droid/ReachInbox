'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/app/login/page';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const OverviewPage = lazy(() => import('@/components/pages/OverviewPage'));
const CampaignsPage = lazy(() => import('@/components/pages/CampaignsPage'));
const ContactsPage = lazy(() => import('@/components/pages/ContactsPage'));
const AnalyticsPage = lazy(() => import('@/components/pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('@/components/pages/SettingsPage'));

type Page = 'overview' | 'campaigns' | 'contacts' | 'analytics' | 'settings';

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={20} style={{ color: '#5856D6' }} className="animate-spin" />
    </div>
  );
}

export default function AppShell() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('overview');

  const checkAuth = useCallback(async () => {
    try {
      const me = await api.get<User>('/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = useCallback(() => {
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).finally(() => {
      setUser(null);
      setCurrentPage('overview');
    });
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F7' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={20} style={{ color: '#5856D6' }} className="animate-spin" />
          <p style={{ fontSize: '13px', color: '#86868B' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const navigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  return (
    <AppLayout
      user={{ name: user.name, email: user.email }}
      currentPage={currentPage}
      onNavigate={navigate}
      onLogout={handleLogout}
    >
      <Suspense fallback={<PageLoader />}>
        {currentPage === 'overview' && <OverviewPage onNavigate={navigate} />}
        {currentPage === 'campaigns' && <CampaignsPage onNavigate={navigate} />}
        {currentPage === 'contacts' && <ContactsPage onNavigate={navigate} />}
        {currentPage === 'analytics' && <AnalyticsPage onNavigate={navigate} />}
        {currentPage === 'settings' && <SettingsPage onNavigate={navigate} />}
      </Suspense>
    </AppLayout>
  );
}
