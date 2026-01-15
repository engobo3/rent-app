import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import './App.css';
import type { Tenant } from './types';
import { db, auth } from './firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';

// Components
import { LandlordDashboard } from './LandlordDashboard';
import { TenantPortal } from './TenantPortal'; // Ensure this uses default export or named export correctly
import { HomePage } from './HomePage';
import { LoginPage } from './LoginPage';
import { Listings } from './Listings.tsx';
import { PublicApply } from './PublicApply';

function PublicLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="public-layout">
      {!isHome && (
        <nav style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderBottom: '1px solid #eee' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>🏠 RentApp</Link>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link to="/" style={{ textDecoration: 'none', color: '#333' }}>Home</Link>
            <Link to="/listings" style={{ textDecoration: 'none', color: '#333' }}>Listings</Link>
            <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', padding: '8px 16px' }}>Login</Link>
          </div>
        </nav>
      )}
      {children}
      {!isHome && (
        <footer style={{ background: '#333', color: 'white', padding: '20px', textAlign: 'center', marginTop: 'auto' }}>
          <p>&copy; {new Date().getFullYear()} RentApp</p>
        </footer>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        // Check if tenant
        const q = query(collection(db, "tenants"), where("email", "==", currentUser.email));
        onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const tenantDoc = snapshot.docs[0];
            setCurrentTenant({ id: tenantDoc.id, ...tenantDoc.data() } as Tenant);
          } else {
            setCurrentTenant(null);
          }
          setLoading(false);
        });
      } else {
        setCurrentTenant(null);
        setLoading(false);
      }
    });

    const handleOffline = () => toast.error("You are offline.", { icon: '⚠️' });
    const handleOnline = () => toast.success("Back online!", { icon: '🟢' });
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      unsubscribe();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    }
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>Loading...</div>;

  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<HomePage />} />
        <Route path="/listings" element={
          <PublicLayout>
            <div className="container" style={{ padding: '40px 20px' }}>
              <h1>Available Listings</h1>
              <Listings />
            </div>
          </PublicLayout>
        } />
        <Route path="/apply" element={
          <PublicLayout>
            <PublicApply />
          </PublicLayout>
        } />
        <Route path="/login" element={<LoginPage />} />

        {/* PROTECTED ROUTES */}
        <Route path="/dashboard" element={
          user ? (
            currentTenant ? <Navigate to="/tenant" /> : <LandlordDashboard user={user} onLogout={() => signOut(auth)} />
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/tenant" element={
          user && currentTenant ? (
            <TenantPortal tenant={currentTenant} onLogout={() => signOut(auth)} />
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