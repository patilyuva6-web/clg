import { ArrowLeft, Calendar, MapPin, PackageSearch, ShieldCheck, Tag } from 'lucide-react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { formatDate, safeImageUrl, timestampToIso } from '../api';
import { ClaimStatusLabel, ItemStatusLabel, ReportTypeText } from '../components/StatusText';
import { OperationType, db, handleFirestoreError } from '../firebase';
import type { ClaimStatus, ItemRecord, PageRoute, StudentUser } from '../types';

interface ItemDetailsPageProps {
  itemId: string;
  student: StudentUser | null;
  onNavigate: (route: PageRoute) => void;
}

export function ItemDetailsPage({ itemId, student, onNavigate }: ItemDetailsPageProps) {
  const [item, setItem] = useState<ItemRecord | null>(null);
  const [userClaim, setUserClaim] = useState<{ claim_id: string; claim_status: ClaimStatus } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    const itemRef = doc(db, 'items', itemId);

    const unsubItem = onSnapshot(
      itemRef,
      (snap) => {
        if (!snap.exists()) {
          setItem(null);
          setNotFound(true);
          setLoading(false);
          return;
        }
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
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.GET, `items/${itemId}`);
      }
    );

    let unsubClaim: (() => void) | undefined;
    if (student) {
      const claimsQuery = query(
        collection(db, 'claims'),
        where('user_id', '==', student.user_id)
      );
      unsubClaim = onSnapshot(
        claimsQuery,
        (snapshot) => {
          const match = snapshot.docs.find((d) => d.data().item_id === itemId);
          if (match) {
            setUserClaim({
              claim_id: match.id,
              claim_status: match.data().claim_status as ClaimStatus,
            });
          } else {
            setUserClaim(null);
          }
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'claims')
      );
    } else {
      setUserClaim(null);
    }

    return () => {
      unsubItem();
      if (unsubClaim) unsubClaim();
    };
  }, [itemId, student]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
        <div className="h-96 rounded-xl border border-slate-200 bg-white animate-pulse" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-14 text-center">
        <div className="bg-white border border-slate-200 rounded-xl p-8">
          <h1 className="font-display text-xl font-bold text-[#0F2544]">Item Unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">
            This item report could not be found or is awaiting administrator moderation.
          </p>
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
  const isOwner = Boolean(student && student.user_id === item.user_id);
  const canClaim = item.status === 'approved' && !isOwner && !userClaim;

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

              {isOwner && item.status === 'approved' && (
                <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-sm text-slate-700">
                  You submitted this report. Any incoming ownership claims will be reviewed by the campus administrator.
                </div>
              )}

              {userClaim && (
                <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#0F2544]">Your Submitted Claim</span>
                    <ClaimStatusLabel status={userClaim.claim_status} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">
                    Your ownership verification request is recorded. Status updates appear here in real time.
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
                      You will be asked to sign in with Google and your USN before submitting a claim.
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
