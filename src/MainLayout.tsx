import { Header } from './Header';
import { Footer } from './Footer';
import { type User } from 'firebase/auth';

interface MainLayoutProps {
    children: React.ReactNode;
    user: User | null;
}

export function MainLayout({ children, user }: MainLayoutProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header user={user} />
            <main style={{ flex: 1 }}>
                {children}
            </main>
            <Footer />
        </div>
    );
}
