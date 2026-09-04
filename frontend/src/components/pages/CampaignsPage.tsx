'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Mail, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import Pagination from '@/components/Pagination';
import ComposeModal from '@/components/ComposeModal';
import { api } from '@/lib/api';
import type { Campaign, CampaignListResponse } from '@/lib/types';
import { format } from 'date-fns';

interface CampaignsPageProps {
  onNavigate?: (page: string) => void;
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#D2D2D7] p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="55%" />
          <Skeleton variant="text" width="35%" />
        </div>
        <Skeleton variant="text" width={70} />
      </div>
      <div className="flex items-center gap-6 pt-3 border-t border-[#E8E8ED]">
        <Skeleton variant="text" width={55} />
        <Skeleton variant="text" width={55} />
        <Skeleton variant="text" width={55} />
      </div>
    </div>
  );
}

function EmptyState({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-[#D2D2D7] p-16">
      <div className="flex flex-col items-center justify-center text-center">
        <Mail size={24} className="text-[#86868B] mb-3" />
        <p className="text-[13px] font-medium text-[#1D1D1F] mb-1">No campaigns yet</p>
        <p className="text-[12px] text-[#86868B] mb-4">
          Create your first email campaign to get started
        </p>
        <Button size="sm" onClick={onCompose}>
          <Plus size={14} />
          New campaign
        </Button>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-[#D2D2D7] p-16">
      <div className="flex flex-col items-center justify-center text-center">
        <AlertCircle size={24} className="text-[#C93434] mb-3" />
        <p className="text-[13px] font-medium text-[#1D1D1F] mb-1">Failed to load campaigns</p>
        <p className="text-[12px] text-[#86868B] mb-4">
          Something went wrong while fetching your campaigns
        </p>
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}

export default function CampaignsPage({ onNavigate }: CampaignsPageProps) {
  const [campaignResponse, setCampaignResponse] = useState<CampaignListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);

  const fetchCampaigns = useCallback(() => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);

    api
      .get<CampaignListResponse>(`/campaigns?${params.toString()}`)
      .then(setCampaignResponse)
      .catch(() => {
        setError(true);
        setCampaignResponse(null);
      })
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const campaignRows: Campaign[] = campaignResponse?.campaigns ?? [];
  const totalPages = campaignResponse?.pagination?.totalPages ?? 0;
  const totalItems = campaignResponse?.pagination?.total ?? 0;
  const currentPage = campaignResponse?.pagination?.page ?? page;
  const currentLimit = campaignResponse?.pagination?.limit ?? 20;

  return (
    <div className="space-y-6" style={{ backgroundColor: '#F5F5F7', minHeight: '100vh' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-[20px] font-semibold text-[#1D1D1F]">
          Campaigns
        </h1>
        <Button onClick={() => setComposeOpen(true)}>
          <Plus size={14} />
          New campaign
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
        <input
          type="text"
          placeholder="Search campaigns..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="h-8 pl-8 pr-3 w-full rounded-md border border-[#D2D2D7] bg-white text-[13px] placeholder:text-[#86868B] focus:outline-none focus:border-[#5856D6] focus:ring-1 focus:ring-[#5856D6]/20 transition-all"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={fetchCampaigns} />
      ) : campaignRows.length === 0 ? (
        <EmptyState onCompose={() => setComposeOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {campaignRows.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white rounded-xl border border-[#D2D2D7] p-5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-medium text-[#1D1D1F] truncate group-hover:text-[#5856D6] transition-colors">
                    {campaign.subject}
                  </h3>
                  <p className="text-[12px] text-[#6E6E73] mt-0.5 truncate">{campaign.senderEmail}</p>
                  <p className="text-[11px] text-[#86868B] mt-1">
                    Created {format(new Date(campaign.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5 pt-3 border-t border-[#E8E8ED]">
                <div className="flex items-center gap-1.5">
                  <Users size={13} className="text-[#86868B]" />
                  <span className="text-[12px] text-[#6E6E73]">
                    {campaign.totalRecipients}
                  </span>
                  <span className="text-[12px] text-[#86868B]">total</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#248A3D]" />
                  <span className="text-[12px] text-[#6E6E73]">
                    {campaign.sentCount ?? 0}
                  </span>
                  <span className="text-[12px] text-[#86868B]">sent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={13} className="text-[#C93434]" />
                  <span className="text-[12px] text-[#6E6E73]">
                    {campaign.failedCount ?? 0}
                  </span>
                  <span className="text-[12px] text-[#86868B]">failed</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          total={totalItems}
          limit={currentLimit}
          onPageChange={setPage}
        />
      )}

      <ComposeModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onCreated={() => {
          setComposeOpen(false);
          fetchCampaigns();
        }}
      />
    </div>
  );
}
