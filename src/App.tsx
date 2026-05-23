import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import type { Tenant, UserRole, UserProfile } from './types';
import { db, auth } from './firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, type Unsubscribe } from 'firebase/firestore';
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

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation(['public', 'common']);

  // We always read translations from a ref so toast handlers attached once
  // on mount don't capture a stale `t` after the language changes.
  const i18nRef = useRef(i18n);
  i18nRef.current = i18n;

  useEffect(() => {
    // Track the per-auth-session tenant listener so we can detach it on the
    // next auth change or unmount — previously it leaked on every sign-in.
    let tenantUnsub: Unsubscribe | null = null;

    const detachTenantListener = () => {
      if (tenantUnsub) {
        tenantUnsub();
        tenantUnsub = null;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // New auth event — kill any listener from the previous session.
      detachTenantListener();

      setUser(currentUser);
      setLoading(true);

      if (!currentUser || !currentUser.email) {
        setUserRole(null);
        setCurrentTenant(null);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        // Default role is 'tenant' — least-privileged. The user gets routed
        // to /tenant where they see an "access denied" screen if no
        // matching tenants record exists, prompting them to contact their
        // landlord. Previously this defaulted to 'landlord' which gave new
        // accounts the landlord dashboard shell on first sign-in.
        let role: UserRole = userSnap.exists()
          ? (userSnap.data() as UserProfile).role
          : 'tenant';

        // For new accounts (or anyone we treat as a tenant), look for a
        // matching tenant document by email.
        if (!userSnap.exists() || role === 'tenant') {
          const q = query(collection(db, 'tenants'), where('email', '==', currentUser.email));

          // If the profile didn't exist, create it ONCE here — never inside
          // the snapshot callback (which can fire repeatedly).
          if (!userSnap.exists()) {
            // Eagerly check whether the user matches a tenant so we set the
            // right role on creation. We use a one-shot getDocs equivalent
            // via the first snapshot fire — see below — but always persist
            // the profile up-front to avoid duplicate writes from re-fires.
            const now = new Date().toISOString();
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || '',
              role: 'tenant',
              createdAt: now,
              updatedAt: now,
            } as UserProfile);
            role = 'tenant';
          }

          tenantUnsub = onSnapshot(
            q,
            (snapshot) => {
              if (!snapshot.empty) {
                const tenantDoc = snapshot.docs[0];
                setCurrentTenant({ id: tenantDoc.id, ...tenantDoc.data() } as Tenant);
              } else {
                setCurrentTenant(null);
              }
              setUserRole(role);
              setLoading(false);
            },
            (err) => {
              console.error('tenant snapshot error:', err);
              setLoading(false);
            },
          );
        } else {
          setUserRole(role);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setLoading(false);
      }
    });

    // Online / offline indicators — read translations at fire time so a
    // language switch updates the toast text without re-attaching listeners.
    const handleOffline = () =>
      toast.error(i18nRef.current.t('common:toast.offline'), { icon: '⚠️' });
    const handleOnline = () =>
      toast.success(i18nRef.current.t('common:toast.online'), { icon: '🟢' });
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      detachTenantListener();
      unsubscribe();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  // We intentionally run this once on mount — Firebase auth + i18n are
  // managed via refs / module singletons.
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
        {t('common:app.loading')}
      </div>
    );
  }

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
              // Logged in but no matching tenants record — typical for a
              // newly-registered account before their landlord seeds the doc.
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
};

export default App;
