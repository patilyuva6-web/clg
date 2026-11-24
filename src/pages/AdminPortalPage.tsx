import {
  Check,
  ClipboardList,
  Database,
  Edit3,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { formatDate, safeImageUrl, timestampToIso } from '../api';
import { ClaimStatusLabel, ItemStatusLabel, ReportTypeText } from '../components/StatusText';
import {
  DEFAULT_CATEGORIES,
  OperationType,
  db,
  handleFirestoreError,
  seedCampusDefaultsIfNeeded,
} from '../firebase';
import type {
  AdminDashboardStats,
  AdminUser,
  Category,
  ClaimRecord,
  ItemRecord,
  ItemStatus,
  PageRoute,
  ReportType,
  StudentUser,
} from '../types';

interface AdminPortalPageProps {
  activeTab: 'admin-dashboard' | 'admin-items' | 'admin-claims';
  admin: AdminUser;
  onNavigate: (route: PageRoute) => void;
  onLogout: () => void;
}

export function AdminPortalPage({
  activeTab,
  admin,
  onNavigate,
  onLogout,
}: AdminPortalPageProps) {
  const [users, setUsers] = useState<StudentUser[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  const [itemStatusFilter, setItemStatusFilter] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
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
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirmation Modal State
  const [deletingItem, setDeletingItem] = useState<ItemRecord | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  // Auto-seed default categories & sample items once when Firestore is empty
  useEffect(() => {
    let active = true;
    seedCampusDefaultsIfNeeded(admin.admin_id)
      .then((seeded) => {
        if (seeded && active) {
          setBanner('Initialized Firestore with default campus categories and sample lost/found reports.');
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to initialize default Firestore records.');
        }
      });
    return () => {
      active = false;
    };
  }, [admin.admin_id]);

  // Real-time Firestore listeners for categories, users, items, and claims
  useEffect(() => {
    setLoading(true);
    let usersLoaded = false;
    let itemsLoaded = false;
    let claimsLoaded = false;

    const markLoaded = () => {
      if (usersLoaded && itemsLoaded && claimsLoaded) {
        setLoading(false);
      }
    };

    const unsubCats = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        if (!snapshot.empty) {
          setCategories(
            snapshot.docs.map((d) => ({
              category_id: d.id,
              category_name: String(d.data().category_name || ''),
            }))
          );
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'categories')
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        setUsers(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              user_id: d.id,
              student_name: String(data.student_name || ''),
              usn: String(data.usn || ''),
              email: String(data.email || ''),
              phone: String(data.phone || ''),
              created_at: timestampToIso(data.created_at),
            };
          })
        );
        usersLoaded = true;
        markLoaded();
      },
      (err) => {
        usersLoaded = true;
        markLoaded();
        handleFirestoreError(err, OperationType.LIST, 'users');
      }
    );

    const unsubItems = onSnapshot(
      collection(db, 'items'),
      (snapshot) => {
        const rows: ItemRecord[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            return {
              item_id: d.id,
              user_id: String(data.user_id || ''),
              category_id: String(data.category_id || ''),
              category_name: String(data.category_name || ''),
              item_name: String(data.item_name || ''),
              description: String(data.description || ''),
              report_type: (data.report_type === 'lost' ? 'lost' : 'found') as ReportType,
              item_date: String(data.item_date || ''),
              location: String(data.location || ''),
              image: typeof data.image === 'string' ? data.image : null,
              status: data.status as ItemStatus,
              created_at: timestampToIso(data.created_at),
              reporter_name: String(data.reporter_name || 'Campus Member'),
            };
          })
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        setItems(rows);
        itemsLoaded = true;
        markLoaded();
      },
      (err) => {
        itemsLoaded = true;
        markLoaded();
        handleFirestoreError(err, OperationType.LIST, 'items');
      }
    );

    const unsubClaims = onSnapshot(
      collection(db, 'claims'),
      (snapshot) => {
        const rows: ClaimRecord[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            return {
              claim_id: d.id,
              item_id: String(data.item_id || ''),
              user_id: String(data.user_id || ''),
              item_name: String(data.item_name || ''),
              item_location: String(data.item_location || ''),
              item_report_type: (data.item_report_type === 'lost' ? 'lost' : 'found') as ReportType,
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
          })
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        setClaims(rows);
        claimsLoaded = true;
        markLoaded();
      },
      (err) => {
        claimsLoaded = true;
        markLoaded();
        handleFirestoreError(err, OperationType.LIST, 'claims');
      }
    );

    return () => {
      unsubCats();
      unsubUsers();
      unsubItems();
      unsubClaims();
    };
  }, []);

  const usersMap = useMemo(() => {
    const map = new Map<string, StudentUser>();
    for (const u of users) {
      map.set(u.user_id, u);
    }
    return map;
  }, [users]);

  const itemsMap = useMemo(() => {
    const map = new Map<string, ItemRecord>();
    for (const item of items) {
      map.set(item.item_id, item);
    }
    return map;
  }, [items]);

  const stats: AdminDashboardStats = useMemo(() => {
    return {
      total_users: users.length,
      total_lost: items.filter((i) => i.report_type === 'lost').length,
      total_found: items.filter((i) => i.report_type === 'found').length,
      pending_reports: items.filter((i) => i.status === 'pending').length,
      approved_reports: items.filter((i) => i.status === 'approved').length,
      returned_items: items.filter((i) => i.status === 'returned').length,
      pending_claims: claims.filter((c) => c.claim_status === 'pending').length,
    };
  }, [users, items, claims]);

  const recentReports = useMemo(() => items.slice(0, 8), [items]);

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return items.filter((item) => {
      if (itemStatusFilter && item.status !== itemStatusFilter) return false;
      if (itemTypeFilter && item.report_type !== itemTypeFilter) return false;
      if (q) {
        const reporter = usersMap.get(item.user_id);
        const hay = [
          item.item_name,
          item.location,
          item.category_name,
          item.reporter_name,
          reporter?.usn || '',
          reporter?.email || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, itemStatusFilter, itemTypeFilter, itemSearch, usersMap]);

  const filteredClaims = useMemo(() => {
    if (!claimStatusFilter) return claims;
    return claims.filter((c) => c.claim_status === claimStatusFilter);
  }, [claims, claimStatusFilter]);

  const handleLoadSamples = async () => {
    setError(null);
    setBanner(null);
    setSeeding(true);
    try {
      const seeded = await seedCampusDefaultsIfNeeded(admin.admin_id);
      if (seeded) {
        setBanner('Sample campus reports and categories loaded into Firestore.');
      } else {
        setBanner('Firestore already contains active categories and item reports.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to seed sample reports.');
    } finally {
      setSeeding(false);
    }
  };

  const updateItemStatus = async (itemId: string, status: ItemStatus) => {
    setError(null);
    setBanner(null);
    const path = `items/${itemId}`;
    try {
      await updateDoc(doc(db, 'items', itemId), {
        status,
        updated_at: serverTimestamp(),
      });
      setBanner(`Report "${itemsMap.get(itemId)?.item_name || itemId}" updated to "${status}".`);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, path);
      } catch (wrapped) {
        setError(wrapped instanceof Error ? wrapped.message : 'Failed to update item status.');
      }
    }
  };

  const openEditModal = (item: ItemRecord) => {
    setEditingItem(item);
    setEditName(item.item_name);
    setEditCatId(item.category_id || categories[0]?.category_id || 'other');
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

    const cleanName = editName.trim();
    const cleanLoc = editLoc.trim();
    const cleanDesc = editDesc.trim();
    if (cleanName.length < 3 || cleanName.length > 140) {
      setError('Item name must be between 3 and 140 characters.');
      return;
    }
    if (cleanLoc.length < 3 || cleanLoc.length > 160) {
      setError('Location must be between 3 and 160 characters.');
      return;
    }
    if (cleanDesc.length < 10 || cleanDesc.length > 2000) {
      setError('Description must be between 10 and 2000 characters.');
      return;
    }

    const chosenCat =
      categories.find((c) => c.category_id === editCatId) ||
      DEFAULT_CATEGORIES.find((c) => c.category_id === editCatId) ||
      categories[0];

    setSavingEdit(true);
    const path = `items/${editingItem.item_id}`;
    try {
      await updateDoc(doc(db, 'items', editingItem.item_id), {
        item_name: cleanName,
        category_id: chosenCat.category_id,
        category_name: chosenCat.category_name,
        description: cleanDesc,
        report_type: editType,
        item_date: editDate,
        location: cleanLoc,
        status: editStatus,
        updated_at: serverTimestamp(),
      });
      setBanner(`Report "${cleanName}" details updated.`);
      setEditingItem(null);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, path);
      } catch (wrapped) {
        setError(wrapped instanceof Error ? wrapped.message : 'Unable to save report edits.');
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    setError(null);
    setBanner(null);
    setDeletingBusy(true);
    const path = `items/${deletingItem.item_id}`;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'items', deletingItem.item_id));
      for (const cl of claims) {
        if (cl.item_id === deletingItem.item_id) {
          batch.delete(doc(db, 'claims', cl.claim_id));
        }
      }
      await batch.commit();
      setBanner(`Report "${deletingItem.item_name}" permanently deleted.`);
      setDeletingItem(null);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, path);
      } catch (wrapped) {
        setError(wrapped instanceof Error ? wrapped.message : 'Unable to delete report.');
      }
    } finally {
      setDeletingBusy(false);
    }
  };

  const handleClaimAction = async (
    claim: ClaimRecord,
    action: 'approve' | 'reject' | 'mark_returned'
  ) => {
    setError(null);
    setBanner(null);
    const path = `claims/${claim.claim_id}`;
    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();

      if (action === 'reject') {
        batch.update(doc(db, 'claims', claim.claim_id), {
          claim_status: 'rejected',
          updated_at: now,
        });
      } else {
        // Approve selected claim and reject competing pending claims for the same item
        batch.update(doc(db, 'claims', claim.claim_id), {
          claim_status: 'approved',
          updated_at: now,
        });
        for (const other of claims) {
          if (
            other.item_id === claim.item_id &&
            other.claim_id !== claim.claim_id &&
            other.claim_status === 'pending'
          ) {
            batch.update(doc(db, 'claims', other.claim_id), {
              claim_status: 'rejected',
              updated_at: now,
            });
          }
        }
        if (action === 'mark_returned') {
          batch.update(doc(db, 'items', claim.item_id), {
            status: 'returned',
            updated_at: now,
          });
        }
      }

      await batch.commit();

      const label =
        action === 'approve'
          ? 'approved'
          : action === 'reject'
            ? 'rejected'
            : 'approved and item marked as returned';
      setBanner(`Claim by ${claim.claimant_name} for "${claim.item_name}" ${label}.`);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, path);
      } catch (wrapped) {
        setError(wrapped instanceof Error ? wrapped.message : 'Unable to process claim.');
      }
    }
  };

  const navItems: {
    id: 'admin-dashboard' | 'admin-items' | 'admin-claims';
    label: string;
    icon: typeof LayoutDashboard;
  }[] = [
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
          <p className="mt-0.5 text-xs text-slate-400 truncate">{admin.email}</p>
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

          <div className="flex items-center gap-2">
            {items.length === 0 && !loading && (
              <button
                type="button"
                disabled={seeding}
                onClick={handleLoadSamples}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#0F2544] hover:bg-slate-50 disabled:opacity-60"
              >
                <Database className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{seeding ? 'Seeding...' : 'Load Sample Items'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#0F2544]"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
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
          <div
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#B91C1C]"
          >
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
                  {loading ? '—' : stats.total_users}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Total Lost Reports</p>
                <p className="mt-1.5 font-display text-2xl font-bold text-[#B91C1C] tabular-nums">
                  {loading ? '—' : stats.total_lost}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Total Found Reports</p>
                <p className="mt-1.5 font-display text-2xl font-bold text-[#1D4ED8] tabular-nums">
                  {loading ? '—' : stats.total_found}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Pending Reports</p>
                <p className="mt-1.5 font-display text-2xl font-bold text-[#B45309] tabular-nums">
                  {loading ? '—' : stats.pending_reports}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Approved Reports</p>
                <p className="mt-1.5 font-display text-2xl font-bold text-[#15803D] tabular-nums">
                  {loading ? '—' : stats.approved_reports}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Pending Claims</p>
                <p className="mt-1.5 font-display text-2xl font-bold text-[#B45309] tabular-nums">
                  {loading ? '—' : stats.pending_claims}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                <h2 className="font-display text-base font-bold text-[#0F2544]">
                  Recently Submitted Reports (Real-Time)
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
                <div className="p-6 text-sm text-slate-500">Syncing live Firestore metrics...</div>
              ) : recentReports.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">No item reports recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-500">
                        <th className="py-3 px-6">Report ID</th>
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Reporter</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-6 text-right">Quick Moderation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {recentReports.map((rep) => {
                        const reporter = usersMap.get(rep.user_id);
                        return (
                          <tr key={rep.item_id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-6 font-mono text-xs text-slate-500 tabular-nums">
                              {rep.item_id.slice(0, 8)}
                            </td>
                            <td className="py-3 px-4 font-medium text-[#0F2544]">{rep.item_name}</td>
                            <td className="py-3 px-4 text-xs">
                              <ReportTypeText type={rep.report_type} />
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {rep.reporter_name}
                              {reporter?.usn && (
                                <span className="ml-1 font-mono text-xs text-slate-400">
                                  ({reporter.usn})
                                </span>
                              )}
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
                        );
                      })}
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
              ) : filteredItems.length === 0 ? (
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
                      {filteredItems.map((item) => {
                        const imgSrc = safeImageUrl(item.image);
                        const reporter = usersMap.get(item.user_id);
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
                                    {item.item_id.slice(0, 8)} · {item.category_name}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-xs whitespace-nowrap">
                              <ReportTypeText type={item.report_type} />
                            </td>
                            <td className="py-4 px-4 text-xs text-slate-600">
                              <p className="font-medium text-[#0F2544]">{item.reporter_name}</p>
                              {reporter ? (
                                <>
                                  <p className="font-mono text-slate-500">{reporter.usn}</p>
                                  <p className="text-slate-500">{reporter.phone}</p>
                                </>
                              ) : (
                                <p className="text-slate-400">Campus Seed Record</p>
                              )}
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
            ) : filteredClaims.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                No ownership claims found for this filter.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredClaims.map((cl) => {
                  const linkedItem = itemsMap.get(cl.item_id);
                  const currentItemStatus = linkedItem?.status || 'approved';
                  const reporter = linkedItem ? usersMap.get(linkedItem.user_id) : undefined;
                  return (
                    <div
                      key={cl.claim_id}
                      className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row justify-between gap-6"
                    >
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="font-mono font-semibold text-[#0F2544] tabular-nums">
                            Claim {cl.claim_id.slice(0, 8)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <ClaimStatusLabel status={cl.claim_status} />
                          <span aria-hidden="true">·</span>
                          <ItemStatusLabel status={currentItemStatus} />
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{formatDate(cl.created_at)}</span>
                        </div>

                        <div>
                          <h3 className="font-display text-lg font-bold text-[#0F2544]">
                            {cl.item_name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {cl.category_name} · {cl.item_location}
                            {linkedItem && (
                              <>
                                {' '}
                                · Reported by {linkedItem.reporter_name}
                                {reporter?.usn && (
                                  <span className="font-mono"> ({reporter.usn})</span>
                                )}
                              </>
                            )}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Claimant Student</p>
                            <p className="mt-1 font-medium text-[#0F2544]">
                              {cl.claimant_name}{' '}
                              <span className="font-mono text-xs text-slate-500">
                                ({cl.claimant_usn})
                              </span>
                            </p>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {cl.claimant_email} · {cl.claimant_phone}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-slate-500">
                              Ownership Reason &amp; Proof
                            </p>
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
                              onClick={() => handleClaimAction(cl, 'approve')}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#15803D] px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap"
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Approve Claim</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleClaimAction(cl, 'reject')}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-[#B91C1C] hover:bg-red-100 whitespace-nowrap"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Reject Claim</span>
                            </button>
                          </>
                        )}

                        {currentItemStatus !== 'returned' && cl.claim_status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => handleClaimAction(cl, 'mark_returned')}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0F2544] px-4 py-2 text-xs font-semibold text-white hover:bg-[#193A68] whitespace-nowrap"
                          >
                            <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Mark Item Returned</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
              Edit Report {editingItem.item_id.slice(0, 8)}
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
                  minLength={3}
                  maxLength={140}
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
                  minLength={3}
                  maxLength={160}
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
                  minLength={10}
                  maxLength={2000}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-[#0F2544]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setEditingItem(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-lg bg-[#0F2544] px-4 py-2 text-xs font-semibold text-white hover:bg-[#193A68] disabled:opacity-60"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
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
              Delete Report {deletingItem.item_id.slice(0, 8)}?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently remove <strong>{deletingItem.item_name}</strong> and any associated ownership claims from Firestore.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deletingBusy}
                onClick={() => setDeletingItem(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingBusy}
                onClick={confirmDelete}
                className="rounded-lg bg-[#B91C1C] px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
              >
                {deletingBusy ? 'Deleting...' : 'Delete Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
