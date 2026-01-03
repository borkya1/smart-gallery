
import React, { useRef, useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { Link, useNavigate } from "react-router-dom"

export default function Login() {
    const emailRef = useRef()
    const passwordRef = useRef()
    const { login } = useAuth()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()

        try {
            setError("")
            setLoading(true)
            await login(emailRef.current.value, passwordRef.current.value)
            navigate("/")
        } catch {
            setError("Failed to sign in")
        }

        setLoading(false)
    }

    return (
        <div style={{ maxWidth: '440px', margin: '4rem auto', fontFamily: 'Inter, sans-serif' }}>
            <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Welcome Back</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Sign in to continue to SmartGallery
                    </p>
                </div>

                {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '0.8rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Email Address</label>
                        <input
                            type="email"
                            ref={emailRef}
                            required
                            placeholder="name@example.com"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem' }}
                        />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Password</label>
                        <input
                            type="password"
                            ref={passwordRef}
                            required
                            placeholder="Enter your password"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem' }}
                        />
                    </div>

                    <button disabled={loading} type="submit" style={{ marginTop: '0.5rem', background: 'linear-gradient(90deg, #7c3aed 0%, #4f46e5 100%)', color: 'white', padding: '0.9rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '1rem' }}>
                        {loading ? "Signing In..." : "Sign In"}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Need an account? <Link to="/signup" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: '600' }}>Sign Up</Link>
                </div>
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>← Back to Home</Link>
                </div>
            </div>
        </div>
    )
}
