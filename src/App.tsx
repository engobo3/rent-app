
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import type { Tenant } from './types';
import { db, auth } from './firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';

// Components
import { MainLayout } from './MainLayout';
import { LandlordDashboard } from './LandlordDashboard';
import { TenantPortal } from './TenantPortal';
import { HomePage } from './HomePage';
import { LoginPage } from './LoginPage';
import { Listings } from './Listings';
import { PublicApply } from './PublicApply';
import { AdminDashboard } from './AdminDashboard';
import type { UserRole, UserProfile } from './types';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation(['public', 'common']);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(true); // Reset loading on every auth state change

      if (currentUser && currentUser.email) {
        try {
          // 1. Check User Profile for Role
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);

          let role: UserRole = 'landlord'; // Default to landlord for now if no profile exists (or could be 'tenant' based on logic)

          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            role = data.role;
          }

          // 2. If Tenant, fetch Tenant Data
          // Check tenants collection if role is 'tenant' or no profile exists yet
          if (role === 'tenant' || !userSnap.exists()) {
            const q = query(collection(db, "tenants"), where("email", "==", currentUser.email));
            onSnapshot(q, async (snapshot) => {
              if (!snapshot.empty) {
                const tenantDoc = snapshot.docs[0];
                setCurrentTenant({ id: tenantDoc.id, ...tenantDoc.data() } as Tenant);
                if (!userSnap.exists()) role = 'tenant';
              } else {
                setCurrentTenant(null);
              }

              // 3. Auto-create user profile if it doesn't exist
              if (!userSnap.exists()) {
                const now = new Date().toISOString();
                await setDoc(doc(db, "users", currentUser.uid), {
                  uid: currentUser.uid,
                  email: currentUser.email,
                  displayName: currentUser.displayName || currentUser.email?.split('@')[0] || '',
                  role,
                  createdAt: now,
                  updatedAt: now,
                } as UserProfile);
              }

              setUserRole(role);
              setLoading(false);
            });
          } else {
            setUserRole(role);
            setLoading(false);
          }

        } catch (error) {
          console.error("Error fetching user role:", error);
          setLoading(false);
        }
      } else {
        setUserRole(null);
        setCurrentTenant(null);
        setLoading(false);
      }
    });

    const handleOffline = () => toast.error(t('common:toast.offline'), { icon: '⚠️' });
    const handleOnline = () => toast.success(t('common:toast.online'), { icon: '🟢' });
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      unsubscribe();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>{t('common:app.loading')}</div>;

  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={
          <MainLayout user={user}>
            <HomePage />
          </MainLayout>
        } />

        <Route path="/listings" element={
          <MainLayout user={user}>
            <div className="container" style={{ padding: '40px 20px', paddingTop: 'var(--content-padding-top)' }}>
              <h1 style={{ marginBottom: '40px', textAlign: 'center' }}>{t('public:listings.title')}</h1>
              <Listings />
            </div>
          </MainLayout>
        } />

        <Route path="/apply" element={
          <MainLayout user={user}>
            <div style={{ paddingTop: 'var(--content-padding-top)' }}>
              <PublicApply />
            </div>
          </MainLayout>
        } />

        <Route path="/login" element={
          <MainLayout user={user}>
            <div style={{ paddingTop: 'var(--content-padding-top)', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LoginPage />
            </div>
          </MainLayout>
        } />

        {/* PROTECTED ROUTES */}
        <Route path="/admin" element={
          user && userRole === 'admin' ? (
            <AdminDashboard user={user} onLogout={() => signOut(auth)} />
          ) : (
            user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
          )
        } />

        <Route path="/dashboard" element={
          user ? (
            userRole === 'admin' ? (
              <Navigate to="/admin" />
            ) : userRole === 'landlord' ? (
              <LandlordDashboard user={user} onLogout={() => signOut(auth)} />
            ) : (
              <Navigate to="/tenant" />
            )
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/tenant" element={
          user ? (
            currentTenant ? (
              <TenantPortal tenant={currentTenant} onLogout={() => signOut(auth)} />
            ) : (
              // If logged in as tenant but no tenant record found
              <div style={{ padding: '50px', textAlign: 'center' }}>
                <h2>{t('public:accessDenied.title')}</h2>
                <p>{t('public:accessDenied.noTenantRecord', { email: user.email })}</p>
                <button onClick={() => signOut(auth)}>{t('common:nav.logout')}</button>
              </div>
            )
          ) : (
            <Navigate to="/login" />
          )
        } />

      </Routes>
      <Toaster />
    </Router>
  );
}


export default App;
