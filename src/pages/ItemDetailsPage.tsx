import { ArrowLeft, Calendar, MapPin, PackageSearch, ShieldCheck, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch, formatDate, safeImageUrl } from '../api';
import { ClaimStatusLabel, ItemStatusLabel, ReportTypeText } from '../components/StatusText';
import type { ItemRecord, PageRoute, StudentUser } from '../types';

interface ItemDetailsPageProps {
  itemId: number;
  student: StudentUser | null;
  token: string | null;
  onNavigate: (route: PageRoute) => void;
}

export function ItemDetailsPage({ itemId, student, token, onNavigate }: ItemDetailsPageProps) {
  const [item, setItem] = useState<ItemRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiFetch<{ item: ItemRecord }>(`/api/items/${itemId}`, { token })
      .then((res) => {
        if (active) setItem(res.item);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load item details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [itemId, token]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
        <div className="h-96 rounded-xl border border-slate-200 bg-white animate-pulse" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-14 text-center">
        <div className="bg-white border border-slate-200 rounded-xl p-8">
          <h1 className="font-display text-xl font-bold text-[#0F2544]">Item Unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{error || 'This item report could not be found.'}</p>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'search' })}
            className="mt-6 rounded-lg bg-[#0F2544] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#193A68]"
          >
            Back to Search Directory
          </button>
        </div>
      </div>
    );
  }

  const imageSrc = safeImageUrl(item.image);
  const canClaim = item.status === 'approved' && !item.is_owner && !item.user_claim;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <button
        type="button"
        onClick={() => onNavigate({ name: 'search' })}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#0F2544]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>Back to Search &amp; Listings</span>
      </button>

      <div className="mt-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 bg-[#EEF2F6] border-b lg:border-b-0 lg:border-r border-slate-200">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={item.item_name}
                referrerPolicy="no-referrer"
                className="h-full min-h-[280px] max-h-[460px] w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 p-8 text-center">
                <PackageSearch className="h-12 w-12 text-[#0F2544]/35" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-500">No photograph uploaded for this report</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <ReportTypeText type={item.report_type} />
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">Ref #{item.item_id}</span>
                <span aria-hidden="true">·</span>
                <ItemStatusLabel status={item.status} />
              </div>

              <h1 className="mt-3 font-display text-2xl font-bold text-[#0F2544] [text-wrap:balance]">
                {item.item_name}
              </h1>

              <p className="mt-4 text-sm leading-relaxed text-slate-700">{item.description}</p>

              <dl className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm">
                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-slate-500">Category</dt>
                    <dd className="font-medium text-[#0F2544]">{item.category_name}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-slate-500">
                      {item.report_type === 'lost' ? 'Date Lost' : 'Date Found'}
                    </dt>
                    <dd className="font-medium text-[#0F2544] tabular-nums">
                      {formatDate(item.item_date)}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-slate-500">Campus Location</dt>
                    <dd className="font-medium text-[#0F2544]">{item.location}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-slate-500">Reported By</dt>
                    <dd className="font-medium text-[#0F2544]">
                      {item.reporter_name || 'Campus Member'}
                      <span className="block text-xs font-normal text-slate-500 mt-0.5">
                        Direct phone and email details are protected. Verification is coordinated by Campus Admin.
                      </span>
                    </dd>
                  </div>
                </div>
              </dl>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100">
              {item.status === 'returned' && (
                <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F2544]">
                  This item has already been verified and returned to its rightful owner.
                </div>
              )}

              {item.status === 'pending' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#B45309]">
                  This report is awaiting administrator approval before claims can be filed.
                </div>
              )}

              {item.is_owner && item.status === 'approved' && (
                <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-sm text-slate-700">
                  You submitted this report. Total claims filed:{' '}
                  <span className="font-semibold tabular-nums">{item.claim_count ?? 0}</span>.
                </div>
              )}

              {item.user_claim && (
                <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#0F2544]">Your Submitted Claim</span>
                    <ClaimStatusLabel status={item.user_claim.claim_status} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">
                    Your ownership verification request is recorded. Administrators will contact you via your registered USN profile once reviewed.
                  </p>
                </div>
              )}

              {canClaim && (
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      student
                        ? onNavigate({ name: 'claim', itemId: item.item_id })
                        : onNavigate({ name: 'login' })
                    }
                    className="w-full rounded-lg bg-[#0F2544] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#193A68]"
                  >
                    {item.report_type === 'found'
                      ? 'Claim Ownership of This Item'
                      : 'Report Recovery / Claim Match'}
                  </button>
                  {!student && (
                    <p className="mt-2 text-center text-xs text-slate-500">
                      You will be asked to sign in with your Student USN before submitting a claim.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
