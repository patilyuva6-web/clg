import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch, formatDate, safeImageUrl } from '../api';
import { ClaimStatusLabel } from '../components/StatusText';
import type { ClaimRecord, ItemRecord, PageRoute, StudentUser } from '../types';

interface ClaimItemPageProps {
  itemId: number;
  student: StudentUser | null;
  token: string | null;
  onNavigate: (route: PageRoute) => void;
}

export function ClaimItemPage({ itemId, student, token, onNavigate }: ClaimItemPageProps) {
  const [item, setItem] = useState<ItemRecord | null>(null);
  const [claimDescription, setClaimDescription] = useState('');
  const [supportingInfo, setSupportingInfo] = useState('');
  const [submittedClaim, setSubmittedClaim] = useState<ClaimRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<{ item: ItemRecord }>(`/api/items/${itemId}`, { token })
      .then((res) => {
        if (active) setItem(res.item);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load item.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [itemId, token]);

  if (!student || !token) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-14 text-center">
        <div className="bg-white border border-slate-200 rounded-xl p-8">
          <h1 className="font-display text-xl font-bold text-[#0F2544]">Sign In to File a Claim</h1>
          <p className="mt-2 text-sm text-slate-600">
            Student authentication is required to verify claimant USN and track claim status.
          </p>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'login' })}
            className="mt-6 rounded-lg bg-[#0F2544] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#193A68]"
          >
            Student Login
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await apiFetch<{ claim: ClaimRecord }>('/api/student/claims', {
        method: 'POST',
        token,
        body: {
          item_id: itemId,
          claim_description: claimDescription,
          supporting_info: supportingInfo,
        },
      });
      setSubmittedClaim(res.claim);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit ownership claim.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <div className="h-72 rounded-xl border border-slate-200 bg-white animate-pulse" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-12">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-sm text-[#B91C1C]">{error || 'Item not found.'}</p>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'search' })}
            className="mt-4 rounded-lg bg-[#0F2544] px-4 py-2 text-xs font-semibold text-white"
          >
            Return to Listings
          </button>
        </div>
      </div>
    );
  }

  const imageSrc = safeImageUrl(item.image);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <button
        type="button"
        onClick={() => onNavigate({ name: 'details', itemId })}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#0F2544]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>Back to Item Details</span>
      </button>

      <div className="mt-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-[#0F2544]">
          Ownership Verification Claim
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Provide specific proof of ownership so the campus administrator can verify and authorize return.
        </p>

        {/* Item Being Claimed Summary */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4">
          {imageSrc && (
            <img
              src={imageSrc}
              alt={item.item_name}
              referrerPolicy="no-referrer"
              className="h-24 w-32 rounded-lg object-cover border border-slate-200 shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="text-xs text-slate-500">
              Item Being Claimed · {item.category_name} · {formatDate(item.item_date)}
            </p>
            <h2 className="mt-1 font-display text-base font-bold text-[#0F2544]">{item.item_name}</h2>
            <p className="mt-1 text-xs text-slate-600">{item.location}</p>
          </div>
        </div>

        {/* Claimant Student Information */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-slate-100 py-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Claimant Name</p>
            <p className="font-medium text-[#0F2544]">{student.student_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">USN / College ID</p>
            <p className="font-mono font-medium text-[#0F2544]">{student.usn}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Registered Contact</p>
            <p className="font-medium text-[#0F2544] truncate">{student.email}</p>
          </div>
        </div>

        {submittedClaim ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#15803D] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#0F2544]">
                    Ownership Claim Submitted (#{submittedClaim.claim_id})
                  </p>
                  <ClaimStatusLabel status={submittedClaim.claim_status} />
                </div>
                <p className="mt-1.5 text-sm text-slate-600">
                  Your claim is now queued for administrator verification. You can monitor approval updates inside your Student Portal.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate({ name: 'student-dashboard' })}
                    className="rounded-lg bg-[#0F2544] px-4 py-2 text-xs font-semibold text-white hover:bg-[#193A68]"
                  >
                    Go to My Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate({ name: 'search' })}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#0F2544] hover:bg-slate-50"
                  >
                    Browse More Items
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#B91C1C]"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="claim-reason" className="block text-sm font-medium text-[#0F2544]">
                Reason for Ownership / Recovery Details
              </label>
              <textarea
                id="claim-reason"
                rows={4}
                required
                minLength={10}
                value={claimDescription}
                onChange={(e) => setClaimDescription(e.target.value)}
                placeholder="Explain when and where you lost or found the item and why it belongs to you."
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
            </div>

            <div>
              <label htmlFor="claim-support" className="block text-sm font-medium text-[#0F2544]">
                Supporting Identifying Information
              </label>
              <textarea
                id="claim-support"
                rows={3}
                required
                value={supportingInfo}
                onChange={(e) => setSupportingInfo(e.target.value)}
                placeholder="Describe unique marks, stickers, serial numbers, wallpaper, key tags, or contents inside."
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => onNavigate({ name: 'details', itemId })}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-[#0F2544] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#193A68] disabled:opacity-60"
              >
                {submitting ? 'Submitting Claim...' : 'Submit Ownership Claim'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
