import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useEffect, useState, type FormEvent } from 'react';
import { formatDate, safeImageUrl, timestampToIso } from '../api';
import { ClaimStatusLabel } from '../components/StatusText';
import { OperationType, db, handleFirestoreError } from '../firebase';
import type { ClaimRecord, ItemRecord, PageRoute, StudentUser } from '../types';

interface ClaimItemPageProps {
  itemId: string;
  student: StudentUser | null;
  onNavigate: (route: PageRoute) => void;
}

export function ClaimItemPage({ itemId, student, onNavigate }: ClaimItemPageProps) {
  const [item, setItem] = useState<ItemRecord | null>(null);
  const [claimDescription, setClaimDescription] = useState('');
  const [supportingInfo, setSupportingInfo] = useState('');
  const [submittedClaim, setSubmittedClaim] = useState<ClaimRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'items', itemId),
      (snap) => {
        if (!snap.exists()) {
          setItem(null);
        } else {
          const data = snap.data();
          setItem({
            item_id: snap.id,
            user_id: String(data.user_id || ''),
            category_id: String(data.category_id || ''),
            category_name: String(data.category_name || ''),
            item_name: String(data.item_name || ''),
            description: String(data.description || ''),
            report_type: data.report_type === 'lost' ? 'lost' : 'found',
            item_date: String(data.item_date || ''),
            location: String(data.location || ''),
            image: typeof data.image === 'string' ? data.image : null,
            status: data.status as ItemRecord['status'],
            created_at: timestampToIso(data.created_at),
            reporter_name: String(data.reporter_name || 'Campus Member'),
          });
        }
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.GET, `items/${itemId}`);
      }
    );
    return () => unsub();
  }, [itemId]);

  if (!student) {
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
    if (!item) return;
    setError(null);

    const reason = claimDescription.trim();
    const support = supportingInfo.trim();

    if (reason.length < 10 || reason.length > 2000) {
      setError('Please explain your reason for ownership or recovery (at least 10 characters).');
      return;
    }

    setSubmitting(true);
    const newClaimRef = doc(collection(db, 'claims'));
    const path = `claims/${newClaimRef.id}`;
    try {
      await setDoc(newClaimRef, {
        item_id: item.item_id,
        item_name: item.item_name,
        item_location: item.location,
        item_report_type: item.report_type,
        category_name: item.category_name,
        user_id: student.user_id,
        claimant_name: student.student_name,
        claimant_usn: student.usn,
        claimant_email: student.email,
        claimant_phone: student.phone,
        claim_description: reason,
        supporting_info: support,
        claim_status: 'pending',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      setSubmittedClaim({
        claim_id: newClaimRef.id,
        item_id: item.item_id,
        item_name: item.item_name,
        item_location: item.location,
        item_report_type: item.report_type,
        category_name: item.category_name,
        user_id: student.user_id,
        claimant_name: student.student_name,
        claimant_usn: student.usn,
        claimant_email: student.email,
        claimant_phone: student.phone,
        claim_description: reason,
        supporting_info: support,
        claim_status: 'pending',
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, path);
      } catch (wrapped) {
        setError(wrapped instanceof Error ? wrapped.message : 'Unable to submit ownership claim.');
      }
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
          <p className="text-sm text-[#B91C1C]">Item not found.</p>
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
                    Ownership Claim Submitted to Firebase
                  </p>
                  <ClaimStatusLabel status={submittedClaim.claim_status} />
                </div>
                <p className="mt-1.5 text-sm text-slate-600">
                  Your claim is now queued for administrator verification. You can monitor live approval updates inside your Student Portal.
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
