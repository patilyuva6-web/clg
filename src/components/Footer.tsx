import type { PageRoute } from '../types';

interface FooterProps {
  onNavigate: (route: PageRoute) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-[#0F2544] text-slate-300 border-t border-[#1B3761]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <p className="font-display text-lg font-bold text-white tracking-tight">CampusFind</p>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-300 max-w-sm">
              College Lost &amp; Found Management System. A centralized campus registry helping students and staff document, verify, and recover misplaced belongings.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Portal Navigation</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'search' })}
                  className="hover:text-white transition-colors"
                >
                  Search Lost &amp; Found Registry
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'report-lost' })}
                  className="hover:text-white transition-colors"
                >
                  Report a Lost Item
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'report-found' })}
                  className="hover:text-white transition-colors"
                >
                  Report a Found Item
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'register' })}
                  className="hover:text-white transition-colors"
                >
                  Student Registration
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Campus Welfare Desk</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Administrative Block, Ground Floor — Student Welfare Office
            </p>
            <p className="mt-1.5 text-sm text-slate-300 tabular-nums">
              Monday – Saturday · 09:00 AM – 05:00 PM
            </p>
            <button
              type="button"
              onClick={() => onNavigate({ name: 'admin-login' })}
              className="mt-4 inline-block text-xs font-medium text-slate-200 underline underline-offset-4 hover:text-white"
            >
              Staff &amp; Administrator Sign In
            </button>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#1B3761] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <p>College Lost &amp; Found Management System · Academic Campus Registry</p>
          <p>Personal student phone and email details are withheld from public listings.</p>
        </div>
      </div>
    </footer>
  );
}
