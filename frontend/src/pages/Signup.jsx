import React, { useRef, useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { Link, useNavigate } from "react-router-dom"

export default function Signup() {
    const emailRef = useRef()
    const passwordRef = useRef()
    const passwordConfirmRef = useRef()
    const { signup } = useAuth()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()

        if (passwordRef.current.value !== passwordConfirmRef.current.value) {
            return setError("Passwords do not match")
        }

        try {
            setError("")
            setLoading(true)
            await signup(emailRef.current.value, passwordRef.current.value)
            navigate("/")
        } catch (e) {
            console.error(e)
            setError("Failed to create an account: " + e.message)
        }

        setLoading(false)
    }

    return (
        <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Sign Up</h2>
                {error && <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>{error}</div>}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                        <label>Email</label>
                        <input type="text" ref={emailRef} required />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                        <label>Password</label>
                        <input type="password" ref={passwordRef} required style={{ width: '100%', padding: '0.8rem 1.2rem', borderRadius: '0.5rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'white' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                        <label>Password Confirmation</label>
                        <input type="password" ref={passwordConfirmRef} required style={{ width: '100%', padding: '0.8rem 1.2rem', borderRadius: '0.5rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'white' }} />
                    </div>
                    <button disabled={loading} type="submit" style={{ marginTop: '1rem', background: 'var(--accent-color)' }}>
                        Sign Up
                    </button>
                </form>
                <div style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--accent-color)' }}>Log In</Link>
                </div>
            </div>
        </div>
    )
}
