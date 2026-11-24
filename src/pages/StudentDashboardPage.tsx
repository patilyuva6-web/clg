import { FilePlus2, LogOut, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch, formatDate, safeImageUrl } from '../api';
import { ClaimStatusLabel, ItemStatusLabel, ReportTypeText } from '../components/StatusText';
import type { ClaimRecord, ItemRecord, PageRoute, StudentUser } from '../types';

interface StudentDashboardPageProps {
  student: StudentUser;
  token: string;
  onNavigate: (route: PageRoute) => void;
  onLogout: () => void;
}

export function StudentDashboardPage({
  student,
  token,
  onNavigate,
  onLogout,
}: StudentDashboardPageProps) {
  const [reports, setReports] = useState<ItemRecord[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadPortal() {
      try {
        const [repRes, clmRes] = await Promise.all([
          apiFetch<{ reports: ItemRecord[] }>('/api/student/reports', { token }),
          apiFetch<{ claims: ClaimRecord[] }>('/api/student/claims', { token }),
        ]);
        if (active) {
          setReports(repRes.reports);
          setClaims(clmRes.claims);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load student portal data.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadPortal();
    return () => {
      active = false;
    };
  }, [token]);

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
            Track moderation status of your lost/found reports and review your submitted ownership claims.
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

      {error && (
        <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#B91C1C]">
          {error}
        </div>
      )}

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
                    <td className="py-3.5 px-4 text-slate-600">{cl.location}</td>
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
