import {
  Check,
  ClipboardList,
  Edit3,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiFetch, formatDate, safeImageUrl } from '../api';
import { ClaimStatusLabel, ItemStatusLabel, ReportTypeText } from '../components/StatusText';
import type {
  AdminDashboardStats,
  AdminUser,
  Category,
  ClaimRecord,
  ItemRecord,
  ItemStatus,
  PageRoute,
  ReportType,
} from '../types';

interface AdminPortalPageProps {
  activeTab: 'admin-dashboard' | 'admin-items' | 'admin-claims';
  admin: AdminUser;
  token: string;
  onNavigate: (route: PageRoute) => void;
  onLogout: () => void;
}

export function AdminPortalPage({
  activeTab,
  admin,
  token,
  onNavigate,
  onLogout,
}: AdminPortalPageProps) {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [recentReports, setRecentReports] = useState<ItemRecord[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [itemStatusFilter, setItemStatusFilter] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState<ItemRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editCatId, setEditCatId] = useState('');
  const [editType, setEditType] = useState<ReportType>('lost');
  const [editDate, setEditDate] = useState('');
  const [editLoc, setEditLoc] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<ItemStatus>('pending');

  // Delete Confirmation Modal State
  const [deletingItem, setDeletingItem] = useState<ItemRecord | null>(null);

  useEffect(() => {
    apiFetch<{ categories: Category[] }>('/api/categories')
      .then((res) => setCategories(res.categories))
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'admin-dashboard') {
        const res = await apiFetch<{ stats: AdminDashboardStats; recent_reports: ItemRecord[] }>(
          '/api/admin/dashboard',
          { token }
        );
        setStats(res.stats);
        setRecentReports(res.recent_reports);
      } else if (activeTab === 'admin-items') {
        const params = new URLSearchParams();
        if (itemStatusFilter) params.set('status', itemStatusFilter);
        if (itemTypeFilter) params.set('report_type', itemTypeFilter);
        if (itemSearch.trim()) params.set('q', itemSearch.trim());
        const res = await apiFetch<{ items: ItemRecord[] }>(`/api/admin/items?${params.toString()}`, {
          token,
        });
        setItems(res.items);
      } else {
        const params = new URLSearchParams();
        if (claimStatusFilter) params.set('status', claimStatusFilter);
        const res = await apiFetch<{ claims: ClaimRecord[] }>(
          `/api/admin/claims?${params.toString()}`,
          { token }
        );
        setClaims(res.claims);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load administrator data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, token, itemStatusFilter, itemTypeFilter, itemSearch, claimStatusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateItemStatus = async (itemId: number, status: ItemStatus) => {
    setError(null);
    setBanner(null);
    try {
      await apiFetch(`/api/admin/items/${itemId}`, {
        method: 'PATCH',
        token,
        body: { status },
      });
      setBanner(`Report #${itemId} updated to "${status}".`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item status.');
    }
  };

  const openEditModal = (item: ItemRecord) => {
    setEditingItem(item);
    setEditName(item.item_name);
    setEditCatId(String(item.category_id));
    setEditType(item.report_type);
    setEditDate(item.item_date);
    setEditLoc(item.location);
    setEditDesc(item.description);
    setEditStatus(item.status);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setError(null);
    setBanner(null);
    try {
      await apiFetch(`/api/admin/items/${editingItem.item_id}`, {
        method: 'PATCH',
        token,
        body: {
          item_name: editName,
          category_id: Number(editCatId),
          report_type: editType,
          item_date: editDate,
          location: editLoc,
          description: editDesc,
          status: editStatus,
        },
      });
      setBanner(`Report #${editingItem.item_id} details updated.`);
      setEditingItem(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save report edits.');
    }
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    setError(null);
    setBanner(null);
    try {
      await apiFetch(`/api/admin/items/${deletingItem.item_id}`, {
        method: 'DELETE',
        token,
      });
      setBanner(`Report #${deletingItem.item_id} permanently deleted.`);
      setDeletingItem(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete report.');
    }
  };

  const handleClaimAction = async (claimId: number, action: 'approve' | 'reject' | 'mark_returned') => {
    setError(null);
    setBanner(null);
    try {
      await apiFetch(`/api/admin/claims/${claimId}`, {
        method: 'PATCH',
        token,
        body: { action },
      });
      const label =
        action === 'approve'
          ? 'approved'
          : action === 'reject'
            ? 'rejected'
            : 'approved and item marked as returned';
      setBanner(`Claim #${claimId} ${label}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process claim.');
    }
  };

  const navItems: { id: 'admin-dashboard' | 'admin-items' | 'admin-claims'; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'admin-dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'admin-items', label: 'Item Reports', icon: ClipboardList },
    { id: 'admin-claims', label: 'Ownership Claims', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F4F6F9] flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 shrink-0 bg-[#0F2544] text-slate-200 border-b lg:border-b-0 lg:border-r border-[#1B3761]">
        <div className="p-6 border-b border-[#1B3761]">
          <p className="text-xs font-medium text-slate-400">Administrator Console</p>
          <p className="mt-1 font-display text-base font-bold text-white truncate">{admin.username}</p>
        </div>

        <nav aria-label="Admin navigation" className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
          {navItems.map((nav) => {
            const Icon = nav.icon;
            const active = activeTab === nav.id;
            return (
              <button
                key={nav.id}
                type="button"
                onClick={() => onNavigate({ name: nav.id })}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#1D4ED8] text-white'
                    : 'text-slate-300 hover:bg-[#193A68] hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{nav.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#1B3761] hidden lg:block">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-[#193A68] hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Workspace */}
      <div className="flex-1 min-w-0 px-4 sm:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Admin Portal /{' '}
              {activeTab === 'admin-dashboard'
                ? 'Dashboard'
                : activeTab === 'admin-items'
                  ? 'Item Management'
                  : 'Claim Management'}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#0F2544]">
              {activeTab === 'admin-dashboard'
                ? 'Campus Operations Overview'
                : activeTab === 'admin-items'
                  ? 'Manage Lost & Found Reports'
                  : 'Verify Ownership Claims'}
            </h1>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#0F2544]"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>

        {banner && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-[#15803D] flex items-center justify-between gap-4">
            <span>{banner}</span>
            <button
              type="button"
              onClick={() => setBanner(null)}
              aria-label="Dismiss notification"
              className="text-xs font-semibold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#B91C1C]">
            {error}
          </div>
        )}

        {/* VIEW 1: ADMIN DASHBOARD */}
        {activeTab === 'admin-dashboard' && (
          <div className="mt-6 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Registered Users</p>
                <p className="mt-1.5 font-display text-2xl font-bold text-[#0F2544] tabular-nums">
                  {stats ? stats.total_users : '—'}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Total Lost Reports</p>
                <p className="mt-1.5 font-display text-2xl font-bold text-[#B91C1C] tabular-nums">
                  {stats ? stats.total_lost : '—'}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Total Found Reports</p>
                <p className="mt-1.5 font-display text-2xl font-bold text-[#1D4ED8] tabular-nums">
                  {stats ? stats.total_found : '—'}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Pending Reports</p>
                <p className="mt-1.5 font-display text-2xl font-bold text-[#B45309] tabular-nums">
                  {stats ? stats.pending_reports : '—'}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Approved Reports</p>
                <p className="mt-1.5 font-display text-2xl font-bold text-[#15803D] tabular-nums">
                  {stats ? stats.approved_reports : '—'}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Pending Claims</p>
                <p className="mt-1.5 font-display text-2xl font-bold text-[#B45309] tabular-nums">
                  {stats ? stats.pending_claims : '—'}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                <h2 className="font-display text-base font-bold text-[#0F2544]">
                  Recently Submitted Reports
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'admin-items' })}
                  className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                >
                  Open Full Item Manager
                </button>
              </div>

              {loading ? (
                <div className="p-6 text-sm text-slate-500">Loading dashboard metrics...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-500">
                        <th className="py-3 px-6">ID</th>
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Reporter</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-6 text-right">Quick Moderation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {recentReports.map((rep) => (
                        <tr key={rep.item_id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-6 font-mono text-xs text-slate-500 tabular-nums">
                            #{rep.item_id}
                          </td>
                          <td className="py-3 px-4 font-medium text-[#0F2544]">{rep.item_name}</td>
                          <td className="py-3 px-4 text-xs">
                            <ReportTypeText type={rep.report_type} />
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {rep.student_name}{' '}
                            <span className="font-mono text-xs text-slate-400">({rep.usn})</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 tabular-nums whitespace-nowrap">
                            {formatDate(rep.item_date)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <ItemStatusLabel status={rep.status} />
                          </td>
                          <td className="py-3 px-6 text-right whitespace-nowrap space-x-2">
                            {rep.status === 'pending' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => updateItemStatus(rep.item_id, 'approved')}
                                  className="rounded-md bg-[#15803D] px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateItemStatus(rep.item_id, 'rejected')}
                                  className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-[#B91C1C] hover:bg-red-100"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onNavigate({ name: 'admin-items' })}
                                className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                              >
                                Manage
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: ADMIN ITEM MANAGEMENT */}
        {activeTab === 'admin-items' && (
          <div className="mt-6 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Filter by item, location, student name or USN..."
                  className="block w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  aria-label="Filter by status"
                  value={itemStatusFilter}
                  onChange={(e) => setItemStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#0F2544]"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="returned">Returned</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  aria-label="Filter by report type"
                  value={itemTypeFilter}
                  onChange={(e) => setItemTypeFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#0F2544]"
                >
                  <option value="">Lost &amp; Found</option>
                  <option value="lost">Lost Only</option>
                  <option value="found">Found Only</option>
                </select>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {loading ? (
                <div className="p-6 text-sm text-slate-500">Loading reports...</div>
              ) : items.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  No reports match the current filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-500">
                        <th className="py-3 px-5">Item &amp; Category</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Reporter Contact</th>
                        <th className="py-3 px-4">Date &amp; Location</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {items.map((item) => {
                        const imgSrc = safeImageUrl(item.image);
                        return (
                          <tr key={item.item_id} className="hover:bg-slate-50/70 align-top">
                            <td className="py-4 px-5">
                              <div className="flex items-start gap-3">
                                {imgSrc && (
                                  <img
                                    src={imgSrc}
                                    alt={item.item_name}
                                    referrerPolicy="no-referrer"
                                    className="h-12 w-16 rounded border border-slate-200 object-cover shrink-0"
                                  />
                                )}
                                <div>
                                  <p className="font-semibold text-[#0F2544]">{item.item_name}</p>
                                  <p className="text-xs text-slate-500">
                                    #{item.item_id} · {item.category_name}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-xs whitespace-nowrap">
                              <ReportTypeText type={item.report_type} />
                            </td>
                            <td className="py-4 px-4 text-xs text-slate-600">
                              <p className="font-medium text-[#0F2544]">{item.student_name}</p>
                              <p className="font-mono text-slate-500">{item.usn}</p>
                              <p className="text-slate-500">{item.phone}</p>
                            </td>
                            <td className="py-4 px-4 text-xs text-slate-600">
                              <p className="tabular-nums font-medium text-[#0F2544]">
                                {formatDate(item.item_date)}
                              </p>
                              <p className="mt-0.5 max-w-[200px]">{item.location}</p>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <ItemStatusLabel status={item.status} />
                            </td>
                            <td className="py-4 px-5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {item.status !== 'approved' && item.status !== 'returned' && (
                                  <button
                                    type="button"
                                    title="Approve Report"
                                    onClick={() => updateItemStatus(item.item_id, 'approved')}
                                    className="rounded-md bg-[#15803D] p-1.5 text-white hover:bg-emerald-700"
                                  >
                                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                )}
                                {item.status !== 'rejected' && item.status !== 'returned' && (
                                  <button
                                    type="button"
                                    title="Reject Report"
                                    onClick={() => updateItemStatus(item.item_id, 'rejected')}
                                    className="rounded-md border border-red-200 bg-red-50 p-1.5 text-[#B91C1C] hover:bg-red-100"
                                  >
                                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                )}
                                {item.status === 'approved' && (
                                  <button
                                    type="button"
                                    title="Mark as Returned"
                                    onClick={() => updateItemStatus(item.item_id, 'returned')}
                                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#0F2544] hover:bg-[#0F2544] hover:text-white"
                                  >
                                    Mark Returned
                                  </button>
                                )}
                                <button
                                  type="button"
                                  title="Edit Report"
                                  onClick={() => openEditModal(item)}
                                  className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 hover:text-[#0F2544]"
                                >
                                  <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  title="Delete Report"
                                  onClick={() => setDeletingItem(item)}
                                  className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-red-50 hover:text-[#B91C1C]"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: ADMIN CLAIM MANAGEMENT */}
        {activeTab === 'admin-claims' && (
          <div className="mt-6 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                Review ownership proof before approving claims or recording physical handover.
              </p>
              <select
                aria-label="Filter claims by status"
                value={claimStatusFilter}
                onChange={(e) => setClaimStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#0F2544]"
              >
                <option value="">All Claims</option>
                <option value="pending">Pending Claims</option>
                <option value="approved">Approved Claims</option>
                <option value="rejected">Rejected Claims</option>
              </select>
            </div>

            {loading ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
                Loading ownership claims...
              </div>
            ) : claims.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                No ownership claims found for this filter.
              </div>
            ) : (
              <div className="space-y-4">
                {claims.map((cl) => (
                  <div
                    key={cl.claim_id}
                    className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row justify-between gap-6"
                  >
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="font-mono font-semibold text-[#0F2544] tabular-nums">
                          Claim #{cl.claim_id}
                        </span>
                        <span aria-hidden="true">·</span>
                        <ClaimStatusLabel status={cl.claim_status} />
                        <span aria-hidden="true">·</span>
                        <ItemStatusLabel status={cl.item_status} />
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatDate(cl.created_at)}</span>
                      </div>

                      <div>
                        <h3 className="font-display text-lg font-bold text-[#0F2544]">
                          {cl.item_name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {cl.category_name} · {cl.location} · Reported by {cl.reporter_name} (
                          <span className="font-mono">{cl.reporter_usn}</span>)
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-slate-500">Claimant Student</p>
                          <p className="mt-1 font-medium text-[#0F2544]">
                            {cl.claimant_name}{' '}
                            <span className="font-mono text-xs text-slate-500">({cl.claimant_usn})</span>
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {cl.claimant_email} · {cl.claimant_phone}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-500">Ownership Reason &amp; Proof</p>
                          <p className="mt-1 text-sm text-slate-700">{cl.claim_description}</p>
                          {cl.supporting_info && (
                            <p className="mt-1 text-xs text-slate-600">
                              Supporting info: {cl.supporting_info}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex lg:flex-col justify-end gap-2.5 shrink-0">
                      {cl.claim_status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleClaimAction(cl.claim_id, 'approve')}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#15803D] px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Approve Claim</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleClaimAction(cl.claim_id, 'reject')}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-[#B91C1C] hover:bg-red-100 whitespace-nowrap"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Reject Claim</span>
                          </button>
                        </>
                      )}

                      {cl.item_status !== 'returned' && cl.claim_status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => handleClaimAction(cl.claim_id, 'mark_returned')}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0F2544] px-4 py-2 text-xs font-semibold text-white hover:bg-[#193A68] whitespace-nowrap"
                        >
                          <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Mark Item Returned</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F2544]/50 p-4"
        >
          <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200 p-6 max-h-[90vh] overflow-y-auto">
            <h2 id="edit-modal-title" className="font-display text-lg font-bold text-[#0F2544]">
              Edit Report #{editingItem.item_id}
            </h2>
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-xs font-medium text-slate-600">
                  Item Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-[#0F2544]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-cat" className="block text-xs font-medium text-slate-600">
                    Category
                  </label>
                  <select
                    id="edit-cat"
                    value={editCatId}
                    onChange={(e) => setEditCatId(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-[#0F2544]"
                  >
                    {categories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-type" className="block text-xs font-medium text-slate-600">
                    Report Type
                  </label>
                  <select
                    id="edit-type"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as ReportType)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-[#0F2544]"
                  >
                    <option value="lost">Lost</option>
                    <option value="found">Found</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-date" className="block text-xs font-medium text-slate-600">
                    Date
                  </label>
                  <input
                    id="edit-date"
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-[#0F2544]"
                  />
                </div>
                <div>
                  <label htmlFor="edit-status" className="block text-xs font-medium text-slate-600">
                    Status
                  </label>
                  <select
                    id="edit-status"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ItemStatus)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-[#0F2544]"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="returned">Returned</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="edit-loc" className="block text-xs font-medium text-slate-600">
                  Location
                </label>
                <input
                  id="edit-loc"
                  type="text"
                  required
                  value={editLoc}
                  onChange={(e) => setEditLoc(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-[#0F2544]"
                />
              </div>

              <div>
                <label htmlFor="edit-desc" className="block text-xs font-medium text-slate-600">
                  Description
                </label>
                <textarea
                  id="edit-desc"
                  rows={3}
                  required
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-[#0F2544]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0F2544] px-4 py-2 text-xs font-semibold text-white hover:bg-[#193A68]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F2544]/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 p-6">
            <h2 id="delete-modal-title" className="font-display text-lg font-bold text-[#0F2544]">
              Delete Report #{deletingItem.item_id}?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently remove <strong>{deletingItem.item_name}</strong> and any associated ownership claims from the database.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-[#B91C1C] px-4 py-2 text-xs font-semibold text-white hover:bg-red-800"
              >
                Delete Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
