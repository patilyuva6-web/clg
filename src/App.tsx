import { onAuthStateChanged, signOut, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { timestampToIso } from './api';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { OperationType, auth, checkIsAdminUser, db, handleFirestoreError } from './firebase';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminPortalPage } from './pages/AdminPortalPage';
import { StudentAuthPage } from './pages/AuthPages';
import { ClaimItemPage } from './pages/ClaimItemPage';
import { HomePage } from './pages/HomePage';
import { ItemDetailsPage } from './pages/ItemDetailsPage';
import { ReportItemPage } from './pages/ReportItemPage';
import { SearchItemsPage } from './pages/SearchItemsPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import type { AdminUser, PageRoute, StudentUser } from './types';

export default function App() {
  const [route, setRoute] = useState<PageRoute>({ name: 'home' });

  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [studentUser, setStudentUser] = useState<StudentUser | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);

  const navigate = (nextRoute: PageRoute) => {
    setLoginNotice(null);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    let active = true;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = undefined;
      }

      if (!active) return;

      if (!fbUser) {
        setFirebaseUser(null);
        setStudentUser(null);
        setAdminUser(null);
        setAuthReady(true);
        return;
      }

      setFirebaseUser(fbUser);

      const isAdmin = await checkIsAdminUser(fbUser.uid, fbUser.email);
      if (!active) return;

      if (isAdmin) {
        setAdminUser({
          admin_id: fbUser.uid,
          username: fbUser.displayName || 'Campus Administrator',
          email: fbUser.email || '',
        });
      } else {
        setAdminUser(null);
      }

      const profilePath = `users/${fbUser.uid}`;
      unsubProfile = onSnapshot(
        doc(db, 'users', fbUser.uid),
        (snap) => {
          if (!active) return;
          if (snap.exists()) {
            const data = snap.data();
            setStudentUser({
              user_id: snap.id,
              student_name: String(data.student_name || fbUser.displayName || ''),
              usn: String(data.usn || ''),
              email: String(data.email || fbUser.email || ''),
              phone: String(data.phone || ''),
              created_at: timestampToIso(data.created_at),
            });
          } else {
            setStudentUser(null);
          }
          setAuthReady(true);
        },
        (err) => {
          setAuthReady(true);
          handleFirestoreError(err, OperationType.GET, profilePath);
        }
      );
    });

    return () => {
      active = false;
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (
      (route.name === 'admin-dashboard' ||
        route.name === 'admin-items' ||
        route.name === 'admin-claims') &&
      !adminUser
    ) {
      setRoute({ name: 'admin-login' });
    }
  }, [authReady, route, adminUser]);

  const handleProfileSaved = (user: StudentUser) => {
    setStudentUser(user);
    setLoginNotice(null);
    setRoute({ name: 'student-dashboard' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStudentLogout = async () => {
    await signOut(auth);
    setStudentUser(null);
    setAdminUser(null);
    setLoginNotice('You have signed out of your campus session.');
    setRoute({ name: 'login' });
  };

  const handleAdminAuthSuccess = (admin: AdminUser) => {
    setAdminUser(admin);
    setRoute({ name: 'admin-dashboard' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLogout = async () => {
    await signOut(auth);
    setAdminUser(null);
    setStudentUser(null);
    setRoute({ name: 'admin-login' });
  };

  const isAdminWorkspace =
    (route.name === 'admin-dashboard' ||
      route.name === 'admin-items' ||
      route.name === 'admin-claims') &&
    Boolean(adminUser);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9] text-[#0F2544]">
      <Navbar
        currentRoute={route}
        student={studentUser}
        admin={adminUser}
        onNavigate={navigate}
      />

      <main className="flex-1">
        {route.name === 'home' && <HomePage student={studentUser} onNavigate={navigate} />}

        {route.name === 'register' && (
          <StudentAuthPage
            mode="register"
            firebaseUser={firebaseUser}
            student={studentUser}
            notice={loginNotice}
            onProfileSaved={handleProfileSaved}
            onNavigate={navigate}
          />
        )}

        {route.name === 'login' && (
          <StudentAuthPage
            mode="login"
            firebaseUser={firebaseUser}
            student={studentUser}
            notice={loginNotice}
            onProfileSaved={handleProfileSaved}
            onNavigate={navigate}
          />
        )}

        {route.name === 'student-dashboard' && studentUser && (
          <StudentDashboardPage
            student={studentUser}
            onNavigate={navigate}
            onLogout={handleStudentLogout}
          />
        )}

        {route.name === 'student-dashboard' && !studentUser && (
          <StudentAuthPage
            mode="login"
            firebaseUser={firebaseUser}
            student={studentUser}
            notice={
              authReady
                ? 'Please sign in with Google and complete your student profile to access your portal.'
                : 'Checking your Firebase authentication session...'
            }
            onProfileSaved={handleProfileSaved}
            onNavigate={navigate}
          />
        )}

        {route.name === 'report-lost' && (
          <ReportItemPage reportType="lost" student={studentUser} onNavigate={navigate} />
        )}

        {route.name === 'report-found' && (
          <ReportItemPage reportType="found" student={studentUser} onNavigate={navigate} />
        )}

        {route.name === 'search' && <SearchItemsPage student={studentUser} onNavigate={navigate} />}

        {route.name === 'details' && (
          <ItemDetailsPage itemId={route.itemId} student={studentUser} onNavigate={navigate} />
        )}

        {route.name === 'claim' && (
          <ClaimItemPage itemId={route.itemId} student={studentUser} onNavigate={navigate} />
        )}

        {route.name === 'admin-login' && (
          <AdminLoginPage
            firebaseUser={firebaseUser}
            onSuccess={handleAdminAuthSuccess}
            onNavigate={navigate}
          />
        )}

        {isAdminWorkspace && adminUser && (
          <AdminPortalPage
            activeTab={route.name as 'admin-dashboard' | 'admin-items' | 'admin-claims'}
            admin={adminUser}
            onNavigate={navigate}
            onLogout={handleAdminLogout}
          />
        )}
      </main>

      {!isAdminWorkspace && <Footer onNavigate={navigate} />}
    </div>
  );
}
