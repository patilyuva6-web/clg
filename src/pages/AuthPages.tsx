import { signInWithPopup, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState, type FormEvent } from 'react';
import { OperationType, auth, db, googleProvider, handleFirestoreError } from '../firebase';
import type { PageRoute, StudentUser } from '../types';

interface StudentAuthPageProps {
  mode: 'login' | 'register';
  firebaseUser: FirebaseAuthUser | null;
  student: StudentUser | null;
  notice?: string | null;
  onProfileSaved: (user: StudentUser) => void;
  onNavigate: (route: PageRoute) => void;
}

export function StudentAuthPage({
  mode,
  firebaseUser,
  student,
  notice,
  onProfileSaved,
  onNavigate,
}: StudentAuthPageProps) {
  const [studentName, setStudentName] = useState(firebaseUser?.displayName || '');
  const [usn, setUsn] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.displayName && !studentName) {
        setStudentName(result.user.displayName);
      }
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

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !firebaseUser.email) return;

    setError(null);
    const cleanName = studentName.trim();
    const cleanUsn = usn.trim().replace(/\s+/g, ' ').toUpperCase();
    const cleanPhone = phone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, '');

    if (cleanName.length < 2 || cleanName.length > 100) {
      setError('Please enter your full student name (2–100 characters).');
      return;
    }
    if (cleanUsn.length < 2 || cleanUsn.length > 32) {
      setError('Please enter a valid USN or College ID (2–32 characters).');
      return;
    }
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      setError('Please enter a valid phone number (7–15 digits).');
      return;
    }

    setSavingProfile(true);
    const path = `users/${firebaseUser.uid}`;
    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        student_name: cleanName,
        usn: cleanUsn,
        email: firebaseUser.email,
        phone: cleanPhone,
        created_at: serverTimestamp(),
      });

      onProfileSaved({
        user_id: firebaseUser.uid,
        student_name: cleanName,
        usn: cleanUsn,
        email: firebaseUser.email,
        phone: cleanPhone,
      });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, path);
      } catch (wrapped) {
        setError(wrapped instanceof Error ? wrapped.message : 'Unable to save student profile.');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  // Already signed in and profile completed
  if (firebaseUser && student) {
    return (
      <div className="mx-auto max-w-md px-4 sm:px-6 py-14">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <h1 className="font-display text-xl font-bold text-[#0F2544]">
            Signed In as {student.student_name}
          </h1>
          <p className="mt-2 text-sm text-slate-600 font-mono">{student.usn}</p>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'student-dashboard' })}
            className="mt-6 w-full rounded-lg bg-[#0F2544] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#193A68]"
          >
            Open My Portal
          </button>
        </div>
      </div>
    );
  }

  // Signed in with Google, needs USN & phone profile stored in Firestore
  if (firebaseUser && !student) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-12">
        <div className="bg-white border border-slate-200 rounded-xl p-8">
          <p className="text-xs font-semibold text-[#1D4ED8]">Step 2 of 2 · Campus Identity</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-[#0F2544]">
            Complete Your Student Profile
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Your Google account ({firebaseUser.email}) is verified. Add your USN / College ID and phone number to activate reporting and ownership claims.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#B91C1C]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
            <div>
              <label htmlFor="prof-name" className="block text-sm font-medium text-[#0F2544]">
                Student Full Name
              </label>
              <input
                id="prof-name"
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Ananya Sharma"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-usn" className="block text-sm font-medium text-[#0F2544]">
                  USN / College ID
                </label>
                <input
                  id="prof-usn"
                  type="text"
                  required
                  value={usn}
                  onChange={(e) => setUsn(e.target.value)}
                  placeholder="e.g. 1BG23BC015"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm uppercase text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
              </div>

              <div>
                <label htmlFor="prof-phone" className="block text-sm font-medium text-[#0F2544]">
                  Phone Number
                </label>
                <input
                  id="prof-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9845011223"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="prof-email" className="block text-sm font-medium text-[#0F2544]">
                Verified Google Email
              </label>
              <input
                id="prof-email"
                type="email"
                readOnly
                value={firebaseUser.email || ''}
                className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-slate-600"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="mt-2 w-full rounded-lg bg-[#0F2544] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#193A68] disabled:opacity-60"
            >
              {savingProfile ? 'Saving Student Profile...' : 'Save & Continue to Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-14">
      <div className="bg-white border border-slate-200 rounded-xl p-8">
        <h1 className="font-display text-2xl font-bold text-[#0F2544]">
          {mode === 'register' ? 'Student Registration' : 'Student Sign In'}
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          {mode === 'register'
            ? 'Verify your account with Google Sign-In, then enter your USN and phone number.'
            : 'Sign in with your Google account to submit lost/found reports and track claims in real time.'}
        </p>

        {notice && (
          <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-[#0F2544]">
            {notice}
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

        <div className="mt-6">
          <button
            type="button"
            disabled={signingIn}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 rounded-lg bg-[#0F2544] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#193A68] disabled:opacity-60"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
              />
            </svg>
            <span>{signingIn ? 'Opening Google Sign-In...' : 'Continue with Google'}</span>
          </button>
        </div>

        <p className="mt-5 text-xs leading-relaxed text-slate-500 text-center">
          Your USN, email, and phone are kept private inside your protected Firestore profile and are never published on public item cards.
        </p>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-600">
          {mode === 'register' ? (
            <>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => onNavigate({ name: 'login' })}
                className="font-semibold text-[#1D4ED8] hover:underline"
              >
                Sign in instead
              </button>
            </>
          ) : (
            <>
              First time on CampusFind?{' '}
              <button
                type="button"
                onClick={() => onNavigate({ name: 'register' })}
                className="font-semibold text-[#1D4ED8] hover:underline"
              >
                Register with Google &amp; USN
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
