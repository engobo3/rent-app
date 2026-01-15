import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

export function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast.success("Logged in!");
            navigate('/dashboard'); // Will redirect to /tenant if tenant logic in App.tsx kicks in
        } catch (err: any) {
            toast.error("Login failed: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '400px', marginTop: '100px' }}>
            <h1 className="header">🔐 Login</h1>
            <form onSubmit={handleLogin} className="tenant-card" style={{ display: 'block' }}>
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', marginBottom: '10px', padding: '8px' }} />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', marginBottom: '10px', padding: '8px' }} />
                <button type="submit" disabled={isLoading} style={{ width: '100%', opacity: isLoading ? 0.7 : 1 }} className="btn-primary">
                    {isLoading ? "Signing In..." : "Sign In"}
                </button>
                <Toaster position="top-center" />
            </form>
        </div>
    );
}
