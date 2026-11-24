import { signInWithPopup, signOut, type User as FirebaseAuthUser } from 'firebase/auth';
import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { ADMIN_EMAIL, auth, checkIsAdminUser, googleProvider } from '../firebase';
import type { AdminUser, PageRoute } from '../types';

interface AdminLoginPageProps {
  firebaseUser: FirebaseAuthUser | null;
  onSuccess: (admin: AdminUser) => void;
  onNavigate: (route: PageRoute) => void;
}

export function AdminLoginPage({ firebaseUser, onSuccess, onNavigate }: AdminLoginPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleAdminSignIn = async () => {
    setError(null);
    setSigningIn(true);
    try {
      let currentUser = firebaseUser;
      if (!currentUser) {
        const result = await signInWithPopup(auth, googleProvider);
        currentUser = result.user;
      }

      const isAdmin = await checkIsAdminUser(currentUser.uid, currentUser.email);
      if (!isAdmin) {
        setError(
          `Signed in as ${currentUser.email || 'unknown account'}, which does not have Campus Administrator privileges. Sign in with the authorized administrator Google account (${ADMIN_EMAIL}).`
        );
        return;
      }

      onSuccess({
        admin_id: currentUser.uid,
        username: currentUser.displayName || 'Campus Administrator',
        email: currentUser.email || ADMIN_EMAIL,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Google Sign-In could not be completed. Please allow popups and try again.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleSwitchAccount = async () => {
    setError(null);
    await signOut(auth);
    await handleAdminSignIn();
  };

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-14">
      <div className="bg-white border border-slate-200 rounded-xl p-8">
        <div className="flex items-center gap-2.5 text-[#0F2544]">
          <ShieldAlert className="h-5 w-5 text-[#1D4ED8]" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
            Restricted Staff Console
          </p>
        </div>

        <h1 className="mt-2 font-display text-2xl font-bold text-[#0F2544]">
          Administrator Sign In
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Authenticate with your authorized Campus Administrator Google account ({ADMIN_EMAIL}) to moderate reports, review ownership claims, and mark items returned.
        </p>

        {error && (
          <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#B91C1C]">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled={signingIn}
            onClick={handleAdminSignIn}
            className="w-full flex items-center justify-center gap-3 rounded-lg bg-[#0F2544] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#193A68] disabled:opacity-60"
          >
            <span>
              {signingIn
                ? 'Verifying Administrator...'
                : firebaseUser
                  ? `Verify Access (${firebaseUser.email})`
                  : 'Sign In with Google as Admin'}
            </span>
          </button>

          {firebaseUser && (
            <button
              type="button"
              disabled={signingIn}
              onClick={handleSwitchAccount}
              className="w-full rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-[#0F2544] hover:bg-slate-50"
            >
              Switch Google Account
            </button>
          )}
        </div>

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
