import { RotateCcw, Search } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { timestampToIso } from '../api';
import { ItemCard } from '../components/ItemCard';
import { DEFAULT_CATEGORIES, OperationType, db, handleFirestoreError } from '../firebase';
import type { Category, ItemRecord, PageRoute, StudentUser } from '../types';

interface SearchItemsPageProps {
  student: StudentUser | null;
  onNavigate: (route: PageRoute) => void;
}

export function SearchItemsPage({ student, onNavigate }: SearchItemsPageProps) {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [publicItems, setPublicItems] = useState<ItemRecord[]>([]);
  const [myItems, setMyItems] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [queryText, setQueryText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [reportType, setReportType] = useState<'all' | 'lost' | 'found'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  useEffect(() => {
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
      (error) => handleFirestoreError(error, OperationType.LIST, 'categories')
    );

    const publicQuery = query(
      collection(db, 'items'),
      where('status', 'in', ['approved', 'returned'])
    );

    const unsubPublic = onSnapshot(
      publicQuery,
      (snapshot) => {
        const mapped: ItemRecord[] = snapshot.docs.map((d) => {
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
            reporter_name: String(data.reporter_name || 'Campus Member'),
          };
        });
        setPublicItems(mapped);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'items');
      }
    );

    let unsubMine: (() => void) | undefined;
    if (student) {
      const myQuery = query(
        collection(db, 'items'),
        where('user_id', '==', student.user_id)
      );
      unsubMine = onSnapshot(
        myQuery,
        (snapshot) => {
          const mapped: ItemRecord[] = snapshot.docs
            .map((d) => {
              const data = d.data();
              return {
                item_id: d.id,
                user_id: String(data.user_id || ''),
                category_id: String(data.category_id || ''),
                category_name: String(data.category_name || ''),
                item_name: String(data.item_name || ''),
                description: String(data.description || ''),
                report_type: (data.report_type === 'lost' ? 'lost' : 'found') as ItemRecord['report_type'],
                item_date: String(data.item_date || ''),
                location: String(data.location || ''),
                image: typeof data.image === 'string' ? data.image : null,
                status: data.status as ItemRecord['status'],
                created_at: timestampToIso(data.created_at),
                reporter_name: String(data.reporter_name || student.student_name),
              };
            })
            .filter((item) => item.status === 'pending');
          setMyItems(mapped);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'items')
      );
    } else {
      setMyItems([]);
    }

    return () => {
      unsubCats();
      unsubPublic();
      if (unsubMine) unsubMine();
    };
  }, [student]);

  const filteredItems = useMemo(() => {
    const map = new Map<string, ItemRecord>();
    for (const item of [...myItems, ...publicItems]) {
      map.set(item.item_id, item);
    }
    const all = Array.from(map.values()).sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );

    const q = queryText.trim().toLowerCase();
    const loc = locationFilter.trim().toLowerCase();

    return all.filter((item) => {
      if (reportType !== 'all' && item.report_type !== reportType) return false;
      if (categoryId && item.category_id !== categoryId) return false;
      if (dateFilter && item.item_date !== dateFilter) return false;
      if (loc && !item.location.toLowerCase().includes(loc)) return false;
      if (
        q &&
        !item.item_name.toLowerCase().includes(q) &&
        !item.description.toLowerCase().includes(q) &&
        !item.location.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [myItems, publicItems, queryText, categoryId, reportType, dateFilter, locationFilter]);

  const resetFilters = () => {
    setQueryText('');
    setCategoryId('');
    setReportType('all');
    setDateFilter('');
    setLocationFilter('');
  };

  const hasFilters = Boolean(
    queryText || categoryId || reportType !== 'all' || dateFilter || locationFilter
  );
  const pendingCount = filteredItems.filter((item) => item.status === 'pending').length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#0F2544]">
            Campus Lost &amp; Found Directory
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Search live lost and found reports across all campus blocks and facilities.
          </p>
        </div>

        {/* Interactive Segmented Control for Lost/Found Filter */}
        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 self-start">
          {(['all', 'lost', 'found'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setReportType(tab)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                reportType === tab
                  ? 'bg-[#0F2544] text-white'
                  : 'text-slate-600 hover:text-[#0F2544] hover:bg-slate-50'
              }`}
            >
              {tab === 'all' ? 'All Items' : tab === 'lost' ? 'Lost Only' : 'Found Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mt-6 bg-white border border-slate-200 rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <label htmlFor="search-q" className="block text-xs font-medium text-slate-500">
              Search Keywords
            </label>
            <div className="relative mt-1.5">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="search-q"
                type="search"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Item name, brand, or description..."
                className="block w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="filter-cat" className="block text-xs font-medium text-slate-500">
              Category
            </label>
            <select
              id="filter-cat"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="filter-loc" className="block text-xs font-medium text-slate-500">
              Campus Location
            </label>
            <input
              id="filter-loc"
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="e.g. Library, Lab 304, Cafeteria"
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="filter-date" className="block text-xs font-medium text-slate-500">
              Date
            </label>
            <input
              id="filter-date"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
            />
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span className="tabular-nums">
            Showing {filteredItems.length} {filteredItems.length === 1 ? 'record' : 'records'}
            {pendingCount > 0 && (
              <span> · Includes {pendingCount} of your pending submissions awaiting admin approval</span>
            )}
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 font-semibold text-[#1D4ED8] hover:text-[#0F2544]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {!student && (
        <p className="mt-4 text-xs text-slate-500">
          Note: Newly submitted reports remain Pending Review until approved by an administrator. Sign in to view your own pending submissions.
        </p>
      )}

      {/* Results Grid */}
      {loading ? (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="font-display text-base font-semibold text-[#0F2544]">
            No matching items found
          </p>
          <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
            Try clearing your filters or submit a new lost or found item report so campus staff can assist.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#0F2544] hover:bg-slate-50"
              >
                Clear All Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate({ name: 'report-lost' })}
              className="rounded-lg bg-[#0F2544] px-4 py-2 text-xs font-semibold text-white hover:bg-[#193A68]"
            >
              Report Lost Item
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <ItemCard
              key={item.item_id}
              item={item}
              onSelect={(itemId) => onNavigate({ name: 'details', itemId })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
