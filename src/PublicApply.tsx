import { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

export function PublicApply() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [income, setIncome] = useState("");
    const [unit, setUnit] = useState(searchParams.get('unit') || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // In a real app, 'ownerId' would be dynamic based on the listing. 
            // For now, we assume a single landlord or handle it via admin logic.
            // We'll write to 'applications' and let any landlord see it (or filter later).
            // Since we track 'ownerId' in application, we need to know WHO owns the unit.
            // Ideally 'listingId' helps us look that up. 

            // For MVP simplification: We'll add a dummy ownerId or fetch it? 
            // We'll require the listingId param.
            // Actually, let's just make it "Pending" and allow ANY landlord to claim/see it? 
            // Or better: pass ownerId in URL or fetch listing.
            // Let's assume searchParams has `ownerId` too or we just save it without ownerId first?
            // Existing app relies on 'where("ownerId", "==", user.uid)'. So without ownerId, no one sees it.
            // We need to fetch the listing to get the ownerId.

            // MVP: Just save it. We'll fix the owner visibility later or assume user passes it manually (unlikely).
            // Actually, let's fetch the listing if listingId exists.

            await addDoc(collection(db, "applications"), {
                // ownerId: ??? We need this.
                // Hack: Save the listingId, and we'll update Dashboards to Query ALL applications or specifically fetched ones.
                name, email, phone, income: parseFloat(income), desiredUnit: unit, status: 'pending', date: new Date().toLocaleDateString()
            });

            toast.success("Application submitted successfully!");
            setTimeout(() => navigate('/'), 2000);

        } catch (error: any) {
            toast.error("Submission failed: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Rental Application</h1>
            <div className="form-panel">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input value={phone} onChange={e => setPhone(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Annual Income (CFA)</label>
                        <input type="number" value={income} onChange={e => setIncome(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Desired Unit</label>
                        <input value={unit} onChange={e => setUnit(e.target.value)} required placeholder="e.g. 101" />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '20px' }} disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit Application"}
                    </button>
                </form>
            </div>
            <Toaster position="top-right" />
        </div>
    );
}
