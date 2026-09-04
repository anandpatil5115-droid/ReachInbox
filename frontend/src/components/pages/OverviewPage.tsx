'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Send,
  TrendingUp,
  Activity,
  Plus,
  Search,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import Pagination from '@/components/Pagination';
import StatusFilter from '@/components/StatusFilter';
import ComposeModal from '@/components/ComposeModal';
import { api } from '@/lib/api';
import type { DashboardStats, EmailMessage, EmailListResponse } from '@/lib/types';
import { format } from 'date-fns';

interface OverviewPageProps {
  onNavigate?: (page: string) => void;
}

function StatSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#D2D2D7] p-5">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="rectangle" width={32} height={32} className="rounded-lg" />
      </div>
      <Skeleton variant="text" width="50%" className="mb-2" />
      <Skeleton variant="text" width="35%" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#E8E8ED]">
          <Skeleton variant="circle" width={32} height={32} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="45%" />
            <Skeleton variant="text" width="25%" />
          </div>
          <Skeleton variant="text" width={90} />
          <Skeleton variant="text" width={70} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox size={24} className="text-[#86868B] mb-3" />
      <p className="text-[13px] font-medium text-[#1D1D1F] mb-1">No emails yet</p>
      <p className="text-[12px] text-[#86868B] mb-4">
        Create your first campaign to get started
      </p>
      <Button size="sm" onClick={onCompose}>
        <Plus size={14} />
        Create campaign
      </Button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle size={24} className="text-[#C93434] mb-3" />
      <p className="text-[13px] font-medium text-[#1D1D1F] mb-1">Failed to load emails</p>
      <p className="text-[12px] text-[#86868B] mb-4">
        Something went wrong while fetching your emails
      </p>
      <Button size="sm" variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export default function OverviewPage({ onNavigate }: OverviewPageProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState('scheduled');
  const [emailResponse, setEmailResponse] = useState<EmailListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    api
      .get<DashboardStats>('/dashboard/stats')
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const fetchEmails = useCallback(() => {
    setTableLoading(true);
    setTableError(false);
    const params = new URLSearchParams({
      limit: '10',
      page: String(page),
      status: activeTab,
    });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter !== 'all') params.set('status', statusFilter);

    api
      .get<EmailListResponse>(`/emails?${params.toString()}`)
      .then(setEmailResponse)
      .catch(() => {
        setTableError(true);
        setEmailResponse(null);
      })
      .finally(() => setTableLoading(false));
  }, [activeTab, page, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const emailRows: EmailMessage[] = emailResponse?.emails ?? [];
  const totalPages = emailResponse?.pagination?.totalPages ?? 0;
  const totalItems = emailResponse?.pagination?.total ?? 0;
  const currentPage = emailResponse?.pagination?.page ?? page;
  const currentLimit = emailResponse?.pagination?.limit ?? 10;

  return (
    <div className="space-y-6" style={{ backgroundColor: '#F5F5F7', minHeight: '100vh' }}>
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <StatsCard
              icon={<Mail size={18} className="text-[#86868B]" />}
              value={stats?.scheduledEmails ?? 0}
              label="Emails queued"
              color="indigo"
            />
            <StatsCard
              icon={<Send size={18} className="text-[#86868B]" />}
              value={stats?.sentThisWeek ?? 0}
              label="Sent this week"
              color="green"
            />
            <StatsCard
              icon={<TrendingUp size={18} className="text-[#86868B]" />}
              value={`${stats?.openRate ?? 0}%`}
              label="Avg. open rate"
              color="blue"
            />
            <StatsCard
              icon={<Activity size={18} className="text-[#86868B]" />}
              value={stats?.queueHealth?.failed === 0 ? 'Healthy' : 'Degraded'}
              label={`W:${stats?.queueHealth?.waiting ?? 0} A:${stats?.queueHealth?.active ?? 0}`}
              color="amber"
            />
          </>
        )}
      </div>

      {/* Email activity */}
      <div className="bg-white rounded-xl border border-[#D2D2D7] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E8E8ED]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4">
              <h2 className="text-[15px] font-semibold text-[#1D1D1F]">
                Email activity
              </h2>
              <Button size="sm" onClick={() => setComposeOpen(true)}>
                <Plus size={14} />
                Compose
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <StatusFilter
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              />
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#86868B]"
                />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 pr-3 w-44 rounded-md border border-[#D2D2D7] bg-white text-[13px] placeholder:text-[#86868B] focus:outline-none focus:border-[#5856D6] focus:ring-1 focus:ring-[#5856D6]/20 transition-all"
                />
              </div>
            </div>
          </div>
          <Tabs
            tabs={[
              { id: 'scheduled', label: 'Scheduled', count: stats?.scheduledEmails },
              { id: 'sent', label: 'Sent', count: stats?.sentThisWeek },
            ]}
            activeTab={activeTab}
            onChange={(id) => {
              setActiveTab(id);
              setPage(1);
            }}
            className="mt-2"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E8ED]">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
                  Recipient
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
                  Subject
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#86868B] hidden md:table-cell">
                  Sender
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#86868B] hidden lg:table-cell">
                  {activeTab === 'scheduled' ? 'Scheduled' : 'Sent'}
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <tr>
                  <td colSpan={5}>
                    <TableSkeleton />
                  </td>
                </tr>
              ) : tableError ? (
                <tr>
                  <td colSpan={5}>
                    <ErrorState onRetry={fetchEmails} />
                  </td>
                </tr>
              ) : emailRows.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState onCompose={() => setComposeOpen(true)} />
                  </td>
                </tr>
              ) : (
                emailRows.map((email) => (
                  <tr
                    key={email.id}
                    className="border-b border-[#E8E8ED] hover:bg-[#F5F5F7]/50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={email.recipient} size="sm" />
                        <span className="text-[13px] text-[#1D1D1F]">{email.recipient}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[13px] font-medium text-[#1D1D1F]">{email.subject}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-[13px] text-[#6E6E73]">{email.senderEmail}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-[13px] text-[#86868B]">
                        {email.sentAt
                          ? format(new Date(email.sentAt), 'MMM d, h:mm a')
                          : email.scheduledAt
                          ? format(new Date(email.scheduledAt), 'MMM d, h:mm a')
                          : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={email.status}>{email.status}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 border-t border-[#E8E8ED]">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              total={totalItems}
              limit={currentLimit}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <ComposeModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onCreated={() => {
          setComposeOpen(false);
          fetchEmails();
        }}
      />
    </div>
  );
}
