import { Eye, EyeOff } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { apiFetch } from '../api';
import type { PageRoute, StudentUser } from '../types';

interface RegisterPageProps {
  onSuccess: (token: string, user: StudentUser) => void;
  onNavigate: (route: PageRoute) => void;
}

export function StudentRegisterPage({ onSuccess, onNavigate }: RegisterPageProps) {
  const [studentName, setStudentName] = useState('');
  const [usn, setUsn] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const errorRef = useRef<HTMLDivElement | null>(null);

  const reportError = (msg: string) => {
    setError(msg);
    requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (studentName.trim().length < 2) {
      reportError('Please enter your full student name (at least 2 characters).');
      return;
    }
    if (usn.trim().length < 2) {
      reportError('Please enter your USN or College ID.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 7) {
      reportError('Please enter a valid phone number (at least 7 digits).');
      return;
    }
    if (password.length < 6) {
      reportError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      reportError('Password and Confirm Password do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{ token: string; user: StudentUser }>('/api/student/register', {
        method: 'POST',
        body: {
          student_name: studentName.trim(),
          usn: usn.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          confirm_password: confirmPassword,
        },
      });
      onSuccess(res.token, res.user);
    } catch (err) {
      reportError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const isDuplicateError = Boolean(error && error.toLowerCase().includes('already registered'));

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-12">
      <div className="bg-white border border-slate-200 rounded-xl p-8">
        <h1 className="font-display text-2xl font-bold text-[#0F2544]">Student Registration</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Create a verified campus account using your University Seat Number (USN) or College ID.
        </p>

        {error && (
          <div
            ref={errorRef}
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#B91C1C]"
          >
            <p className="font-medium">{error}</p>
            {isDuplicateError && (
              <button
                type="button"
                onClick={() => onNavigate({ name: 'login' })}
                className="mt-2 inline-block text-xs font-semibold text-[#0F2544] underline underline-offset-2 hover:text-[#1D4ED8]"
              >
                Go to Student Sign In
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-[#0F2544]">
              Student Full Name
            </label>
            <input
              id="reg-name"
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
              <label htmlFor="reg-usn" className="block text-sm font-medium text-[#0F2544]">
                USN / College ID
              </label>
              <input
                id="reg-usn"
                type="text"
                required
                value={usn}
                onChange={(e) => setUsn(e.target.value)}
                placeholder="e.g. 1BG23BC015"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm uppercase text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
              <p className="mt-1 text-xs text-slate-500">Letters, numbers, dashes, or slashes</p>
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-sm font-medium text-[#0F2544]">
                Phone Number
              </label>
              <input
                id="reg-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9845011223"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
              <p className="mt-1 text-xs text-slate-500">7–15 digits</p>
            </div>
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-[#0F2544]">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@college.edu"
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-[#0F2544]">
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="block w-full rounded-lg border border-slate-300 bg-white pl-3.5 pr-10 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-[#0F2544]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-[#0F2544]">
                Confirm Password
              </label>
              <input
                id="reg-confirm"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-[#0F2544] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#193A68] disabled:opacity-60"
          >
            {submitting ? 'Creating Account...' : 'Register Student Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered?{' '}
          <button
            type="button"
            onClick={() => onNavigate({ name: 'login' })}
            className="font-semibold text-[#1D4ED8] hover:underline"
          >
            Sign in to your portal
          </button>
        </p>
      </div>
    </div>
  );
}

interface LoginPageProps {
  onSuccess: (token: string, user: StudentUser) => void;
  onNavigate: (route: PageRoute) => void;
  notice?: string | null;
}

export function StudentLoginPage({ onSuccess, onNavigate, notice }: LoginPageProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ token: string; user: StudentUser }>('/api/student/login', {
        method: 'POST',
        body: { identifier: identifier.trim(), password },
      });
      onSuccess(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-14">
      <div className="bg-white border border-slate-200 rounded-xl p-8">
        <h1 className="font-display text-2xl font-bold text-[#0F2544]">Student Sign In</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Access your campus lost &amp; found reports and track ownership claims.
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-id" className="block text-sm font-medium text-[#0F2544]">
              Email or USN
            </label>
            <input
              id="login-id"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. 1BG23BC015 or student@college.edu"
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-[#0F2544]">
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="block w-full rounded-lg border border-slate-300 bg-white pl-3.5 pr-10 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-[#0F2544]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-[#0F2544] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#193A68] disabled:opacity-60"
          >
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-600">
          New to CampusFind?{' '}
          <button
            type="button"
            onClick={() => onNavigate({ name: 'register' })}
            className="font-semibold text-[#1D4ED8] hover:underline"
          >
            Create Student Account
          </button>
        </div>
      </div>
    </div>
  );
}
