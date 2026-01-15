import { Link } from 'react-router-dom';
import { Listings } from './Listings.tsx';

export function HomePage() {
    return (
        <div className="homepage">
            {/* NAVBAR */}
            <nav style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>🏠 RentApp</div>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <Link to="/" style={{ textDecoration: 'none', color: '#333' }}>Home</Link>
                    <Link to="/listings" style={{ textDecoration: 'none', color: '#333' }}>Listings</Link>
                    <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', padding: '8px 16px' }}>Login</Link>
                </div>
            </nav>

            {/* HERO SECTION */}
            <div style={{
                height: '500px',
                background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                textAlign: 'center'
            }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>Find Your Perfect Home</h1>
                <p style={{ fontSize: '1.2rem', marginBottom: '30px', maxWidth: '600px' }}>
                    Browse our curated selection of premium rentals. Apply online and move in tomorrow.
                </p>
                <Link to="/listings" className="btn-primary" style={{ fontSize: '1.2rem', padding: '12px 30px', textDecoration: 'none' }}>View Available Units</Link>
            </div>

            {/* FEATURED LISTINGS */}
            <div className="container" style={{ padding: '40px 20px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Featured Properties</h2>
                <Listings limit={3} />
                <div style={{ textAlign: 'center', marginTop: '30px' }}>
                    <Link to="/listings" className="btn-secondary" style={{ textDecoration: 'none' }}>View All Listings</Link>
                </div>
            </div>

            {/* READY TO APPLY */}
            <div style={{ padding: '60px 20px', background: 'var(--primary-color)', color: 'white', textAlign: 'center' }}>
                <h2 style={{ marginBottom: '20px', color: 'white' }}>Ready to Move In?</h2>
                <p style={{ fontSize: '1.2rem', marginBottom: '30px', maxWidth: '700px', margin: '0 auto 30px auto' }}>
                    Already found your dream unit or want to submit a general application?
                    Start the process now and get approved in as little as 24 hours.
                </p>
                <Link to="/apply" className="btn-secondary" style={{ fontSize: '1.2rem', padding: '12px 30px', textDecoration: 'none', background: 'white', color: 'var(--primary-color)', fontWeight: 'bold' }}>Start Application</Link>
            </div>

            {/* CONTACT US */}
            <div style={{ padding: '60px 20px', background: '#f9f9f9' }}>
                <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>Contact Us</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
                        <div style={{ padding: '30px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📍</div>
                            <h3 style={{ marginBottom: '10px', fontSize: '1.2rem', color: '#333' }}>Visit Our Office</h3>
                            <p style={{ color: '#666', lineHeight: '1.6' }}>
                                123 Rental Avenue<br />
                                Suite 100<br />
                                Cityville, ST 12345
                            </p>
                        </div>

                        <div style={{ padding: '30px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📞</div>
                            <h3 style={{ marginBottom: '10px', fontSize: '1.2rem', color: '#333' }}>Call Us</h3>
                            <p style={{ color: '#666', marginBottom: '10px' }}>
                                <a href="tel:+15551234567" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 'bold' }}>(555) 123-4567</a>
                            </p>
                            <p style={{ fontSize: '0.9rem', color: '#999' }}>
                                Mon-Fri: 9am - 6pm<br />
                                Sat: 10am - 4pm
                            </p>
                        </div>

                        <div style={{ padding: '30px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>✉️</div>
                            <h3 style={{ marginBottom: '10px', fontSize: '1.2rem', color: '#333' }}>Email Us</h3>
                            <p style={{ color: '#666', marginBottom: '15px' }}>
                                Have questions? Drop us a line anytime.
                            </p>
                            <p>
                                <a href="mailto:info@rentapp.com" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 'bold' }}>info@rentapp.com</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <footer style={{ background: '#333', color: 'white', padding: '40px 20px', textAlign: 'center' }}>
                <p>&copy; {new Date().getFullYear()} RentApp. All rights reserved.</p>
            </footer>
        </div>
    );
}
