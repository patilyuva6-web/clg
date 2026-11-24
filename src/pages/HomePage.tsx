import { ArrowRight, FilePlus2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { ItemCard } from '../components/ItemCard';
import type { ItemRecord, PageRoute, PublicStats, StudentUser } from '../types';

interface HomePageProps {
  student: StudentUser | null;
  onNavigate: (route: PageRoute) => void;
}

export function HomePage({ student, onNavigate }: HomePageProps) {
  const [recentItems, setRecentItems] = useState<ItemRecord[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadHome() {
      try {
        const [itemsRes, statsRes] = await Promise.all([
          apiFetch<{ items: ItemRecord[] }>('/api/items?limit=6'),
          apiFetch<PublicStats>('/api/stats/public'),
        ]);
        if (active) {
          setRecentItems(itemsRes.items);
          setStats(statsRes);
        }
      } catch {
        // Handled cleanly via empty fallback
      } finally {
        if (active) setLoading(false);
      }
    }
    loadHome();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-wide text-[#1D4ED8]">
                Official Campus Recovery Portal
              </p>
              <h1 className="mt-3 font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-[1.15] text-[#0F2544] [text-wrap:balance]">
                Centralized Lost &amp; Found Registry for Campus Belongings
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-600 max-w-xl">
                Report misplaced electronics, ID cards, books, and personal items across campus buildings. Every listing and ownership claim is verified by the Student Welfare Office before handover.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'search' })}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0F2544] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#193A68] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  <span>Search Lost &amp; Found</span>
                </button>

                {student ? (
                  <button
                    type="button"
                    onClick={() => onNavigate({ name: 'student-dashboard' })}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#0F2544] transition-colors hover:bg-slate-50 whitespace-nowrap"
                  >
                    <span>Open My Portal</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onNavigate({ name: 'register' })}
                      className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#0F2544] transition-colors hover:bg-slate-50 whitespace-nowrap"
                    >
                      Student Register
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate({ name: 'login' })}
                      className="px-3 py-2 text-sm font-semibold text-[#1D4ED8] hover:text-[#0F2544] transition-colors whitespace-nowrap"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[260px] lg:min-h-[360px] w-full overflow-hidden rounded-xl border border-slate-200 bg-[#EEF2F6]">
                <img
                  src="/src/assets/images/hero_campus_commons_1795497659132.jpg"
                  alt="University student commons and library atrium"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0F2544]/85 via-[#0F2544]/35 to-transparent p-6">
                  <p className="text-xs font-medium text-slate-200">
                    Central Library · Academic Blocks · Cafeteria · Labs
                  </p>
                  <p className="mt-1 font-display text-sm font-semibold text-white">
                    Verified student identity and administrator-moderated claims
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Column Campus KPI Strip */}
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-xl bg-[#F8FAFC] divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">Active Lost Reports</p>
              <p className="mt-1.5 font-display text-2xl font-bold text-[#0F2544] tabular-nums">
                {stats ? stats.active_lost : '—'}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">Found &amp; Held Items</p>
              <p className="mt-1.5 font-display text-2xl font-bold text-[#0F2544] tabular-nums">
                {stats ? stats.active_found : '—'}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">Items Returned to Owners</p>
              <p className="mt-1.5 font-display text-2xl font-bold text-[#15803D] tabular-nums">
                {stats ? stats.returned_count : '—'}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">Tracked Categories</p>
              <p className="mt-1.5 font-display text-2xl font-bold text-[#0F2544] tabular-nums">
                {stats ? stats.category_count : '—'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Report Lost / Found Action Band */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-7 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-[#B91C1C]">Misplaced Something on Campus?</p>
              <h2 className="mt-2 font-display text-xl font-bold text-[#0F2544]">
                Report a Lost Item
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Log the item description, date, campus building, and reference photograph so staff and fellow students can alert you if it is turned in.
              </p>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => onNavigate({ name: 'report-lost' })}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0F2544] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#193A68]"
              >
                <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                <span>Report Lost Item</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-7 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-[#1D4ED8]">Found an Unattended Belonging?</p>
              <h2 className="mt-2 font-display text-xl font-bold text-[#0F2544]">
                Report a Found Item
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Register found items with location and photo evidence. Your personal contact information stays private while administrators verify rightful owners.
              </p>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => onNavigate({ name: 'report-found' })}
                className="inline-flex items-center gap-2 rounded-lg border border-[#0F2544] bg-white px-5 py-2.5 text-sm font-semibold text-[#0F2544] transition-colors hover:bg-[#0F2544] hover:text-white"
              >
                <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                <span>Report Found Item</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How the System Works */}
      <section className="bg-white border-y border-slate-200 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#0F2544]">
              How the Campus Recovery Workflow Operates
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              A structured three-stage process ensures legitimate ownership verification and protects student privacy.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border-t-2 border-[#0F2544] pt-5">
              <h3 className="font-display text-base font-bold text-[#0F2544]">
                01. Submit Verified Report
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Registered students submit lost or found item reports with campus location, date, category, and optional photograph. Administrators review each entry before publishing.
              </p>
            </div>

            <div className="border-t-2 border-[#1D4ED8] pt-5">
              <h3 className="font-display text-base font-bold text-[#0F2544]">
                02. Search &amp; File Ownership Claim
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Students filter listings by keyword, category, building, or date. If an item matches yours, submit an ownership claim with identifying proof without exposing reporter phone numbers.
              </p>
            </div>

            <div className="border-t-2 border-[#15803D] pt-5">
              <h3 className="font-display text-base font-bold text-[#0F2544]">
                03. Admin Verification &amp; Handover
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Campus administrators cross-check claim evidence against item details, approve valid claims, coordinate safe pickup at the Welfare Desk, and mark the item as returned.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Reported Items */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#0F2544]">
              Recently Reported Items
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Approved lost and found records published across campus buildings.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'search' })}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1D4ED8] hover:text-[#0F2544] whitespace-nowrap"
          >
            <span>Browse All Listings</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-80 rounded-xl border border-slate-200 bg-white animate-pulse"
              />
            ))}
          </div>
        ) : recentItems.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-medium text-[#0F2544]">No approved items listed yet.</p>
            <p className="mt-1 text-sm text-slate-500">
              Submit a lost or found item report to populate the campus registry.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentItems.map((item) => (
              <ItemCard
                key={item.item_id}
                item={item}
                onSelect={(itemId) => onNavigate({ name: 'details', itemId })}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
