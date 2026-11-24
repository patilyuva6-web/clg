import { FilePlus2, LogOut, Search } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { formatDate, safeImageUrl, timestampToIso } from '../api';
import { ClaimStatusLabel, ItemStatusLabel, ReportTypeText } from '../components/StatusText';
import { OperationType, db, handleFirestoreError } from '../firebase';
import type { ClaimRecord, ItemRecord, PageRoute, StudentUser } from '../types';

interface StudentDashboardPageProps {
  student: StudentUser;
  onNavigate: (route: PageRoute) => void;
  onLogout: () => void;
}

export function StudentDashboardPage({
  student,
  onNavigate,
  onLogout,
}: StudentDashboardPageProps) {
  const [reports, setReports] = useState<ItemRecord[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const reportsQuery = query(
      collection(db, 'items'),
      where('user_id', '==', student.user_id)
    );
    const claimsQuery = query(
      collection(db, 'claims'),
      where('user_id', '==', student.user_id)
    );

    const unsubReports = onSnapshot(
      reportsQuery,
      (snapshot) => {
        const rows: ItemRecord[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            item_id: d.id,
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
            reporter_name: String(data.reporter_name || student.student_name),
          };
        });
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
        setReports(rows);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'items');
      }
    );

    const unsubClaims = onSnapshot(
      claimsQuery,
      (snapshot) => {
        const rows: ClaimRecord[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            claim_id: d.id,
            item_id: String(data.item_id || ''),
            user_id: String(data.user_id || ''),
            item_name: String(data.item_name || ''),
            item_location: String(data.item_location || ''),
            item_report_type: data.item_report_type === 'lost' ? 'lost' : 'found',
            category_name: String(data.category_name || ''),
            claimant_name: String(data.claimant_name || ''),
            claimant_usn: String(data.claimant_usn || ''),
            claimant_email: String(data.claimant_email || ''),
            claimant_phone: String(data.claimant_phone || ''),
            claim_description: String(data.claim_description || ''),
            supporting_info: String(data.supporting_info || ''),
            claim_status: data.claim_status as ClaimRecord['claim_status'],
            created_at: timestampToIso(data.created_at),
          };
        });
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
        setClaims(rows);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'claims');
      }
    );

    return () => {
      unsubReports();
      unsubClaims();
    };
  }, [student.user_id, student.student_name]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wide">
            USN {student.usn} · {student.email}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-[#0F2544]">
            Welcome, {student.student_name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track live moderation status of your lost/found reports and review your submitted ownership claims.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate({ name: 'report-lost' })}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F2544] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#193A68] whitespace-nowrap"
          >
            <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Report Lost</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'report-found' })}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#0F2544] hover:bg-slate-50 whitespace-nowrap"
          >
            <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Report Found</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F8FAFC] px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-[#B91C1C] hover:border-red-200 whitespace-nowrap"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 border border-slate-200 rounded-xl bg-white divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Submitted Item Reports</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#0F2544] tabular-nums">
            {reports.length}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Active Approved Reports</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#15803D] tabular-nums">
            {reports.filter((r) => r.status === 'approved').length}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Submitted Ownership Claims</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#1D4ED8] tabular-nums">
            {claims.length}
          </p>
        </div>
      </div>

      {/* My Submitted Reports */}
      <section className="mt-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-[#0F2544]">My Submitted Reports</h2>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'search' })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Browse Campus Registry</span>
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading your reports...</div>
        ) : reports.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-[#0F2544]">You have not submitted any lost or found reports yet.</p>
            <p className="mt-1 text-sm text-slate-500">
              Use the Report Lost or Report Found buttons above to log an item.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-500">
                  <th className="py-3 px-6">Item</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {reports.map((rep) => {
                  const thumb = safeImageUrl(rep.image);
                  return (
                    <tr key={rep.item_id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-6 font-medium text-[#0F2544]">
                        <div className="flex items-center gap-3">
                          {thumb && (
                            <img
                              src={thumb}
                              alt={rep.item_name}
                              referrerPolicy="no-referrer"
                              className="h-10 w-14 rounded border border-slate-200 object-cover shrink-0"
                            />
                          )}
                          <span>{rep.item_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <ReportTypeText type={rep.report_type} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{rep.category_name}</td>
                      <td className="py-3.5 px-4 text-slate-600 tabular-nums whitespace-nowrap">
                        {formatDate(rep.item_date)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{rep.location}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <ItemStatusLabel status={rep.status} />
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onNavigate({ name: 'details', itemId: rep.item_id })}
                          className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* My Ownership Claims */}
      <section className="mt-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-display text-lg font-bold text-[#0F2544]">My Ownership Claims</h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading your claims...</div>
        ) : claims.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-[#0F2544]">No ownership claims submitted yet.</p>
            <p className="mt-1 text-sm text-slate-500">
              When you find your belonging in the registry, open its details page to submit a claim.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-500">
                  <th className="py-3 px-6">Claimed Item</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Submitted Reason</th>
                  <th className="py-3 px-4">Claim Status</th>
                  <th className="py-3 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {claims.map((cl) => (
                  <tr key={cl.claim_id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-6 font-medium text-[#0F2544]">{cl.item_name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{cl.item_location}</td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-sm truncate">{cl.claim_description}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <ClaimStatusLabel status={cl.claim_status} />
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onNavigate({ name: 'details', itemId: cl.item_id })}
                        className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                      >
                        Open Item
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
