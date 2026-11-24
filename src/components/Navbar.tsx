import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { AdminUser, PageRoute, StudentUser } from '../types';

interface NavbarProps {
  currentRoute: PageRoute;
  student: StudentUser | null;
  admin: AdminUser | null;
  onNavigate: (route: PageRoute) => void;
}

export function Navbar({ currentRoute, student, admin, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (route: PageRoute) => {
    setMobileOpen(false);
    onNavigate(route);
  };

  const navLinkClass = (active: boolean) =>
    `text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 pb-0.5 border-b-2 ${
      active
        ? 'text-[#0F2544] border-[#1D4ED8]'
        : 'text-slate-600 border-transparent hover:text-[#0F2544] hover:border-slate-300'
    }`;

  const primaryAction = () => {
    if (admin) {
      return (
        <button
          type="button"
          onClick={() => go({ name: 'admin-dashboard' })}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2544] rounded-lg hover:bg-[#193A68] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
        >
          Admin Console
        </button>
      );
    }
    if (student) {
      return (
        <button
          type="button"
          onClick={() => go({ name: 'student-dashboard' })}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2544] rounded-lg hover:bg-[#193A68] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
        >
          My Portal
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => go({ name: 'login' })}
        className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2544] rounded-lg hover:bg-[#193A68] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
      >
        Student Login
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 h-16">
        {/* Zone 1: Single-line brand wordmark */}
        <button
          type="button"
          onClick={() => go({ name: 'home' })}
          className="font-display text-xl font-bold tracking-tight text-[#0F2544] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
        >
          CampusFind
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
          <button
            type="button"
            onClick={() => go({ name: 'home' })}
            className={navLinkClass(currentRoute.name === 'home')}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => go({ name: 'search' })}
            className={navLinkClass(currentRoute.name === 'search' || currentRoute.name === 'details')}
          >
            Browse Items
          </button>
          <button
            type="button"
            onClick={() => go({ name: 'report-lost' })}
            className={navLinkClass(currentRoute.name === 'report-lost')}
          >
            Report Lost
          </button>
          <button
            type="button"
            onClick={() => go({ name: 'report-found' })}
            className={navLinkClass(currentRoute.name === 'report-found')}
          >
            Report Found
          </button>
          <button
            type="button"
            onClick={() => go(admin ? { name: 'admin-dashboard' } : { name: 'admin-login' })}
            className={navLinkClass(currentRoute.name.startsWith('admin-'))}
          >
            Admin Portal
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:block">{primaryAction()}</div>
          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-[#0F2544] hover:bg-slate-50"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
          <button
            type="button"
            onClick={() => go({ name: 'home' })}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#0F2544] rounded-lg hover:bg-slate-50"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => go({ name: 'search' })}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#0F2544] rounded-lg hover:bg-slate-50"
          >
            Browse Items
          </button>
          <button
            type="button"
            onClick={() => go({ name: 'report-lost' })}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#0F2544] rounded-lg hover:bg-slate-50"
          >
            Report Lost Item
          </button>
          <button
            type="button"
            onClick={() => go({ name: 'report-found' })}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#0F2544] rounded-lg hover:bg-slate-50"
          >
            Report Found Item
          </button>
          <button
            type="button"
            onClick={() => go(admin ? { name: 'admin-dashboard' } : { name: 'admin-login' })}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#0F2544] rounded-lg hover:bg-slate-50"
          >
            Admin Portal
          </button>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
            {primaryAction()}
            {!student && !admin && (
              <button
                type="button"
                onClick={() => go({ name: 'register' })}
                className="px-4 py-2 text-xs font-semibold text-[#0F2544] border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
              >
                Register
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
