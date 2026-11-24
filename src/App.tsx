import { useEffect, useState } from 'react';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminPortalPage } from './pages/AdminPortalPage';
import { StudentLoginPage, StudentRegisterPage } from './pages/AuthPages';
import { ClaimItemPage } from './pages/ClaimItemPage';
import { HomePage } from './pages/HomePage';
import { ItemDetailsPage } from './pages/ItemDetailsPage';
import { ReportItemPage } from './pages/ReportItemPage';
import { SearchItemsPage } from './pages/SearchItemsPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import type { AdminUser, PageRoute, StudentUser } from './types';

export default function App() {
  const [route, setRoute] = useState<PageRoute>({ name: 'home' });

  // Sessions kept strictly in React memory (never localStorage/sessionStorage)
  const [studentToken, setStudentToken] = useState<string | null>(null);
  const [studentUser, setStudentUser] = useState<StudentUser | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);

  const navigate = (nextRoute: PageRoute) => {
    setLoginNotice(null);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (
      (route.name === 'admin-dashboard' ||
        route.name === 'admin-items' ||
        route.name === 'admin-claims') &&
      (!adminToken || !adminUser)
    ) {
      setRoute({ name: 'admin-login' });
    }
  }, [route, adminToken, adminUser]);

  const handleStudentAuthSuccess = (token: string, user: StudentUser) => {
    setStudentToken(token);
    setStudentUser(user);
    setLoginNotice(null);
    setRoute({ name: 'student-dashboard' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStudentLogout = () => {
    setStudentToken(null);
    setStudentUser(null);
    setLoginNotice('You have signed out of your student session.');
    setRoute({ name: 'login' });
  };

  const handleAdminAuthSuccess = (token: string, admin: AdminUser) => {
    setAdminToken(token);
    setAdminUser(admin);
    setRoute({ name: 'admin-dashboard' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    setAdminUser(null);
    setRoute({ name: 'admin-login' });
  };

  const isAdminWorkspace =
    (route.name === 'admin-dashboard' ||
      route.name === 'admin-items' ||
      route.name === 'admin-claims') &&
    adminToken &&
    adminUser;

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
          <StudentRegisterPage onSuccess={handleStudentAuthSuccess} onNavigate={navigate} />
        )}

        {route.name === 'login' && (
          <StudentLoginPage
            onSuccess={handleStudentAuthSuccess}
            onNavigate={navigate}
            notice={loginNotice}
          />
        )}

        {route.name === 'student-dashboard' && studentUser && studentToken && (
          <StudentDashboardPage
            student={studentUser}
            token={studentToken}
            onNavigate={navigate}
            onLogout={handleStudentLogout}
          />
        )}

        {route.name === 'student-dashboard' && (!studentUser || !studentToken) && (
          <StudentLoginPage
            onSuccess={handleStudentAuthSuccess}
            onNavigate={navigate}
            notice="Please sign in to access your student portal."
          />
        )}

        {route.name === 'report-lost' && (
          <ReportItemPage
            reportType="lost"
            student={studentUser}
            token={studentToken}
            onNavigate={navigate}
          />
        )}

        {route.name === 'report-found' && (
          <ReportItemPage
            reportType="found"
            student={studentUser}
            token={studentToken}
            onNavigate={navigate}
          />
        )}

        {route.name === 'search' && <SearchItemsPage token={studentToken} onNavigate={navigate} />}

        {route.name === 'details' && (
          <ItemDetailsPage
            itemId={route.itemId}
            student={studentUser}
            token={studentToken}
            onNavigate={navigate}
          />
        )}

        {route.name === 'claim' && (
          <ClaimItemPage
            itemId={route.itemId}
            student={studentUser}
            token={studentToken}
            onNavigate={navigate}
          />
        )}

        {route.name === 'admin-login' && (
          <AdminLoginPage onSuccess={handleAdminAuthSuccess} onNavigate={navigate} />
        )}

        {isAdminWorkspace && (
          <AdminPortalPage
            activeTab={route.name as 'admin-dashboard' | 'admin-items' | 'admin-claims'}
            admin={adminUser}
            token={adminToken}
            onNavigate={navigate}
            onLogout={handleAdminLogout}
          />
        )}
      </main>

      {!isAdminWorkspace && <Footer onNavigate={navigate} />}
    </div>
  );
}
