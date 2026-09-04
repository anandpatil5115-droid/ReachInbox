'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import type { EmailMessage, Campaign, EmailListResponse, CampaignListResponse } from '@/lib/types';
import { format } from 'date-fns';

interface Contact {
  email: string;
  lastCampaign: string | null;
  lastCampaignDate: string | null;
  totalEmails: number;
  status: 'active' | 'bounced';
}

interface ContactsPageProps {
  onNavigate?: (page: string) => void;
}

function ContactSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-[#E8E8ED]">
      <Skeleton variant="circle" width={36} height={36} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="25%" />
      </div>
      <Skeleton variant="text" width={80} />
      <Skeleton variant="text" width={60} />
      <Skeleton variant="text" width={70} />
    </div>
  );
}

export default function ContactsPage({ onNavigate }: ContactsPageProps) {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<EmailListResponse>('/emails?limit=200').catch(() => null),
      api.get<CampaignListResponse>('/campaigns?limit=100').catch(() => null),
    ]).then(([emailRes, campaignRes]) => {
      setEmails(emailRes?.emails ?? []);
      setCampaigns(campaignRes?.campaigns ?? []);
      setLoading(false);
    });
  }, []);

  const contacts = useMemo(() => {
    const map = new Map<string, Contact>();

    for (const email of emails) {
      const existing = map.get(email.recipient);
      const campaign = campaigns.find((c) => c.id === email.campaignId);

      if (existing) {
        existing.totalEmails++;
        if (email.sentAt && (!existing.lastCampaignDate || email.sentAt > existing.lastCampaignDate)) {
          existing.lastCampaignDate = email.sentAt;
          existing.lastCampaign = campaign?.subject ?? null;
        }
        if (email.status === 'failed') {
          existing.status = 'bounced';
        }
      } else {
        map.set(email.recipient, {
          email: email.recipient,
          lastCampaign: campaign?.subject ?? null,
          lastCampaignDate: email.sentAt,
          totalEmails: 1,
          status: email.status === 'failed' ? 'bounced' : 'active',
        });
      }
    }

    return Array.from(map.values());
  }, [emails, campaigns]);

  const filtered = useMemo(() => {
    if (!search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter((c) => c.email.toLowerCase().includes(q));
  }, [contacts, search]);

  const totalPages = Math.ceil(filtered.length / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-[#1D1D1F]">
          Contacts
        </h1>
        <p className="text-[13px] text-[#6E6E73] mt-1">Manage your email recipients</p>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="h-8 pl-9 pr-3 w-full rounded-lg border border-[#D2D2D7] bg-white text-[13px] placeholder:text-[#86868B] focus:outline-none focus:border-[#5856D6] focus:ring-1 focus:ring-[#5856D6]/20 transition-all"
        />
      </div>

      <div className="bg-white rounded-xl border border-[#E8E8ED] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E8ED]">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
                  Email
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#86868B] hidden md:table-cell">
                  Last campaign
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#86868B] hidden lg:table-cell">
                  Total emails
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4}>
                    <div className="space-y-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <ContactSkeleton key={i} />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#F5F5F7] mb-4">
                        <Users size={24} className="text-[#86868B]" />
                      </div>
                      <p className="text-[13px] font-medium text-[#1D1D1F] mb-1">No contacts yet</p>
                      <p className="text-[12px] text-[#86868B]">
                        Contacts will appear after you create campaigns
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((contact) => (
                  <tr
                    key={contact.email}
                    className="border-b border-[#E8E8ED] hover:bg-[#F5F5F7] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={contact.email} size="sm" />
                        <span className="text-[13px] text-[#1D1D1F]">{contact.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <div>
                        {contact.lastCampaign ? (
                          <>
                            <span className="text-[13px] text-[#1D1D1F]">{contact.lastCampaign}</span>
                            {contact.lastCampaignDate && (
                              <p className="text-[12px] text-[#86868B] mt-0.5">
                                {format(new Date(contact.lastCampaignDate), 'MMM d, yyyy')}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-[13px] text-[#86868B]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-[13px] font-medium text-[#1D1D1F]">{contact.totalEmails}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={contact.status === 'active' ? 'sent' : 'failed'}>
                        {contact.status}
                      </Badge>
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
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              limit={limit}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
