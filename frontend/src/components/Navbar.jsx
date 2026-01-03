import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Navbar() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    async function handleLogout() {
        try {
            await logout();
            navigate("/login");
        } catch {
            console.error("Failed to log out");
        }
    }

    // Helper to determine if a link is active
    const isActive = (path) => location.pathname === path;

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ cursor: 'pointer' }} onClick={() => navigate("/")}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                    Smart<span style={{ color: 'var(--accent-color)' }}>Gallery</span>
                </h1>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                    AI-Powered Semantic Image Search
                </p>
            </div>
            <div>
                {currentUser ? (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{currentUser.email}</span>
                        <button
                            onClick={handleLogout}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid var(--text-secondary)' }}
                        >
                            Log Out
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => navigate("/login")}>Log In</button>
                        <button
                            onClick={() => navigate("/signup")}
                            style={{ background: 'var(--accent-color)', borderColor: 'var(--accent-color)' }}
                        >
                            Sign Up
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
