import { ShieldAlert } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '../api';
import type { AdminUser, PageRoute } from '../types';

interface AdminLoginPageProps {
  onSuccess: (token: string, admin: AdminUser) => void;
  onNavigate: (route: PageRoute) => void;
}

export function AdminLoginPage({ onSuccess, onNavigate }: AdminLoginPageProps) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [envConfigured, setEnvConfigured] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ configured: boolean; envConfigured: boolean; username: string | null }>('/api/admin/status')
      .then((res) => {
        setConfigured(res.configured);
        setEnvConfigured(res.envConfigured);
        if (res.username) {
          setUsername(res.username);
        }
      })
      .catch(() => setConfigured(true));
  }, []);

  const handleBootstrap = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<{ token: string; admin: AdminUser }>('/api/admin/bootstrap', {
        method: 'POST',
        body: { username, password, confirm_password: confirmPassword },
      });
      onSuccess(res.token, res.admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to initialize administrator account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ token: string; admin: AdminUser }>('/api/admin/login', {
        method: 'POST',
        body: { username, password },
      });
      onSuccess(res.token, res.admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid administrator credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  if (configured === null) {
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <div className="h-64 rounded-xl border border-slate-200 bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-14">
      <div className="bg-white border border-slate-200 rounded-xl p-8">
        <div className="flex items-center gap-2.5 text-[#0F2544]">
          <ShieldAlert className="h-5 w-5 text-[#1D4ED8]" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
            Restricted Staff Console
          </p>
        </div>

        {!configured ? (
          <>
            <h1 className="mt-2 font-display text-2xl font-bold text-[#0F2544]">
              First-Run Administrator Setup
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              No campus administrator password has been claimed yet. Choose your administrator username and password to lock and activate the staff console.
            </p>

            {error && (
              <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#B91C1C]">
                {error}
              </div>
            )}

            <form onSubmit={handleBootstrap} className="mt-6 space-y-4">
              <div>
                <label htmlFor="admin-setup-user" className="block text-sm font-medium text-[#0F2544]">
                  Administrator Username
                </label>
                <input
                  id="admin-setup-user"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
              </div>

              <div>
                <label htmlFor="admin-setup-pass" className="block text-sm font-medium text-[#0F2544]">
                  Choose Password
                </label>
                <input
                  id="admin-setup-pass"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
              </div>

              <div>
                <label htmlFor="admin-setup-confirm" className="block text-sm font-medium text-[#0F2544]">
                  Confirm Password
                </label>
                <input
                  id="admin-setup-confirm"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#0F2544] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193A68] disabled:opacity-60"
              >
                {submitting ? 'Claiming Admin Access...' : 'Claim & Activate Admin Console'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-2 font-display text-2xl font-bold text-[#0F2544]">
              Administrator Sign In
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Sign in to moderate lost &amp; found submissions, verify ownership claims, and mark items returned.
            </p>
            {envConfigured && (
              <p className="mt-2 text-xs text-slate-500">
                Server environment passcode protection is active.
              </p>
            )}

            {error && (
              <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#B91C1C]">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label htmlFor="admin-user" className="block text-sm font-medium text-[#0F2544]">
                  Admin Username
                </label>
                <input
                  id="admin-user"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
              </div>

              <div>
                <label htmlFor="admin-pass" className="block text-sm font-medium text-[#0F2544]">
                  Password / Passcode
                </label>
                <input
                  id="admin-pass"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#0F2544] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193A68] disabled:opacity-60"
              >
                {submitting ? 'Verifying...' : 'Sign In to Admin Console'}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => onNavigate({ name: 'home' })}
            className="text-xs font-medium text-slate-600 hover:text-[#0F2544]"
          >
            Return to Student Home Page
          </button>
        </div>
      </div>
    </div>
  );
}
