'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Send,
  CheckCircle2,
  AlertCircle,
  Activity,
  Clock,
  TrendingUp,
  Mail,
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import Skeleton from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import type {
  DashboardStats,
  Campaign,
  EmailMessage,
  CampaignListResponse,
  EmailListResponse,
} from '@/lib/types';
import { format, subDays, isAfter } from 'date-fns';

interface AnalyticsPageProps {
  onNavigate?: (page: string) => void;
}

type DateRange = '7d' | '30d' | 'all';

function StatSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#E8E8ED] p-5">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="rectangle" width={40} height={40} className="rounded-lg" />
      </div>
      <Skeleton variant="text" width="60%" className="mb-2" />
      <Skeleton variant="text" width="40%" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#E8E8ED] p-6">
      <Skeleton variant="text" width="30%" className="mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton variant="text" width={100} />
            <Skeleton variant="rectangle" className="flex-1 h-6 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage({ onNavigate }: AnalyticsPageProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<DashboardStats>('/dashboard/stats').catch(() => null),
      api.get<CampaignListResponse>('/campaigns?limit=100').catch(() => null),
      api.get<EmailListResponse>('/emails?limit=500').catch(() => null),
    ]).then(([statsData, campaignRes, emailRes]) => {
      setStats(statsData);
      setCampaigns(campaignRes?.campaigns ?? []);
      setEmails(emailRes?.emails ?? []);
      setLoading(false);
    });
  }, []);

  const filteredEmails = useMemo(() => {
    if (dateRange === 'all') return emails;
    const cutoff = subDays(new Date(), dateRange === '7d' ? 7 : 30);
    return emails.filter((e) => isAfter(new Date(e.createdAt), cutoff));
  }, [emails, dateRange]);

  const totalSent = filteredEmails.filter((e) => e.status === 'sent').length;
  const totalFailed = filteredEmails.filter((e) => e.status === 'failed').length;
  const totalPending = filteredEmails.filter((e) => e.status === 'pending').length;
  const totalProcessing = filteredEmails.filter((e) => e.status === 'processing').length;
  const totalEmails = filteredEmails.length;
  const successRate = totalEmails > 0 ? Math.round((totalSent / totalEmails) * 100) : 0;

  const activeCampaigns = campaigns.length;

  const avgEmailsPerDay = useMemo(() => {
    if (dateRange === 'all' && filteredEmails.length > 0) {
      const first = filteredEmails.reduce((min, e) =>
        new Date(e.createdAt) < new Date(min.createdAt) ? e : min
      , filteredEmails[0]);
      const days = Math.max(1, Math.ceil((Date.now() - new Date(first.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
      return Math.round(totalEmails / days);
    }
    const days = dateRange === '7d' ? 7 : 30;
    return Math.round(totalEmails / days);
  }, [filteredEmails, totalEmails, dateRange]);

  const campaignPerformance = useMemo(() => {
    return campaigns.map((c) => {
      const campaignEmails = filteredEmails.filter((e) => e.campaignId === c.id);
      const sent = campaignEmails.filter((e) => e.status === 'sent').length;
      const failed = campaignEmails.filter((e) => e.status === 'failed').length;
      const total = campaignEmails.length;
      const rate = total > 0 ? Math.round((sent / total) * 100) : 0;
      return { ...c, sent, failed, total, rate };
    }).filter((c) => c.total > 0).sort((a, b) => b.sent - a.sent).slice(0, 8);
  }, [campaigns, filteredEmails]);

  const maxCampaignEmails = useMemo(() => {
    return Math.max(1, ...campaignPerformance.map((c) => c.total));
  }, [campaignPerformance]);

  const recentActivity = useMemo(() => {
    return filteredEmails
      .filter((e) => e.status === 'sent' || e.status === 'failed')
      .sort((a, b) => new Date(b.sentAt || b.createdAt).getTime() - new Date(a.sentAt || a.createdAt).getTime())
      .slice(0, 10);
  }, [filteredEmails]);

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: 'all', label: 'All time' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-[#1D1D1F]">
            Analytics
          </h1>
          <p className="text-[13px] text-[#6E6E73] mt-1">Track your email performance</p>
        </div>
        <div className="flex items-center gap-0.5 bg-white rounded-lg border border-[#E8E8ED] p-0.5">
          {dateRangeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                dateRange === opt.value
                  ? 'bg-[#5856D6] text-white'
                  : 'text-[#6E6E73] hover:bg-[#F5F5F7]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

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
              icon={<Send size={20} />}
              value={totalSent}
              label="Emails sent"
              color="green"
            />
            <StatsCard
              icon={<CheckCircle2 size={20} />}
              value={`${successRate}%`}
              label="Success rate"
              color="indigo"
            />
            <StatsCard
              icon={<Activity size={20} />}
              value={activeCampaigns}
              label="Active campaigns"
              color="blue"
            />
            <StatsCard
              icon={<TrendingUp size={20} />}
              value={avgEmailsPerDay}
              label="Avg emails/day"
              color="amber"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <ChartSkeleton />
        ) : (
          <div className="bg-white rounded-xl border border-[#E8E8ED] p-6">
            <h3 className="text-[13px] font-semibold text-[#1D1D1F] mb-5">
              Campaign performance
            </h3>
            {campaignPerformance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BarChart3 size={24} className="text-[#86868B] mb-2" />
                <p className="text-[12px] text-[#86868B]">No campaign data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaignPerformance.map((c) => (
                  <div key={c.id} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] font-medium text-[#1D1D1F] truncate max-w-[180px]">
                        {c.subject}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-[#248A3D]">{c.sent} sent</span>
                        {c.failed > 0 && (
                          <span className="text-[12px] text-[#C93434]">{c.failed} failed</span>
                        )}
                        <span className="text-[12px] font-semibold text-[#1D1D1F] w-8 text-right">
                          {c.rate}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-[#F5F5F7] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(c.total / maxCampaignEmails) * 100}%`,
                          background: `linear-gradient(90deg, #248A3D ${c.rate}%, #C93434 ${c.rate}%)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <ChartSkeleton />
        ) : (
          <div className="bg-white rounded-xl border border-[#E8E8ED] p-6">
            <h3 className="text-[13px] font-semibold text-[#1D1D1F] mb-5">
              Email status breakdown
            </h3>
            {totalEmails === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Mail size={24} className="text-[#86868B] mb-2" />
                <p className="text-[12px] text-[#86868B]">No email data yet</p>
              </div>
            ) : (
              <>
                <div className="w-full h-6 rounded-md overflow-hidden flex mb-5">
                  {totalPending > 0 && (
                    <div
                      className="h-full bg-[#B86E00] transition-all duration-500"
                      style={{ width: `${(totalPending / totalEmails) * 100}%` }}
                      title={`Pending: ${totalPending}`}
                    />
                  )}
                  {totalProcessing > 0 && (
                    <div
                      className="h-full bg-[#5856D6] transition-all duration-500"
                      style={{ width: `${(totalProcessing / totalEmails) * 100}%` }}
                      title={`Processing: ${totalProcessing}`}
                    />
                  )}
                  {totalSent > 0 && (
                    <div
                      className="h-full bg-[#248A3D] transition-all duration-500"
                      style={{ width: `${(totalSent / totalEmails) * 100}%` }}
                      title={`Sent: ${totalSent}`}
                    />
                  )}
                  {totalFailed > 0 && (
                    <div
                      className="h-full bg-[#C93434] transition-all duration-500"
                      style={{ width: `${(totalFailed / totalEmails) * 100}%` }}
                      title={`Failed: ${totalFailed}`}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-[#B86E00]" />
                    <span className="text-[12px] text-[#6E6E73]">Pending</span>
                    <span className="text-[12px] font-semibold text-[#1D1D1F] ml-auto">{totalPending}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-[#5856D6]" />
                    <span className="text-[12px] text-[#6E6E73]">Processing</span>
                    <span className="text-[12px] font-semibold text-[#1D1D1F] ml-auto">{totalProcessing}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-[#248A3D]" />
                    <span className="text-[12px] text-[#6E6E73]">Sent</span>
                    <span className="text-[12px] font-semibold text-[#1D1D1F] ml-auto">{totalSent}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-[#C93434]" />
                    <span className="text-[12px] text-[#6E6E73]">Failed</span>
                    <span className="text-[12px] font-semibold text-[#1D1D1F] ml-auto">{totalFailed}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#E8E8ED] p-6">
        <h3 className="text-[13px] font-semibold text-[#1D1D1F] mb-5">
          Recent activity
        </h3>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton variant="circle" width={8} height={8} className="mt-1.5" />
                <div className="flex-1 space-y-1">
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="30%" />
                </div>
              </div>
            ))}
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Clock size={24} className="text-[#86868B] mb-2" />
            <p className="text-[12px] text-[#86868B]">No recent activity</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[3px] top-2 bottom-2 w-px bg-[#E8E8ED]" />

            <div className="space-y-4">
              {recentActivity.map((email) => {
                const campaign = campaigns.find((c) => c.id === email.campaignId);
                const isFailed = email.status === 'failed';
                return (
                  <div key={email.id} className="flex items-start gap-3 relative">
                    <div
                      className={`w-[7px] h-[7px] rounded-full mt-1.5 z-10 ${
                        isFailed ? 'bg-[#C93434]' : 'bg-[#248A3D]'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#1D1D1F]">
                        {isFailed ? 'Failed to send' : 'Email sent to'}{' '}
                        <span className="font-medium">{email.recipient}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[12px] text-[#86868B]">
                          {format(
                            new Date(email.sentAt || email.createdAt),
                            'MMM d, h:mm a'
                          )}
                        </span>
                        {campaign && (
                          <>
                            <span className="text-[12px] text-[#86868B]">·</span>
                            <span className="text-[12px] text-[#6E6E73]">{campaign.subject}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
