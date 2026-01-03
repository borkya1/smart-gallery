
import React, { useState, useEffect, useRef } from "react"
import { useAuth } from "../contexts/AuthContext"
import { Link, useNavigate } from "react-router-dom"
import { api } from "../api/client"
import { updateProfile } from "firebase/auth";

export default function Signup() {
    const { signup } = useAuth()
    const navigate = useNavigate()

    // Steps: 1=Email, 2=OTP, 3=Details
    const [step, setStep] = useState(1)

    // Form State
    const [email, setEmail] = useState("")
    const [otp, setOtp] = useState(["", "", "", "", "", ""])
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    // UI State
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [resendTimer, setResendTimer] = useState(30)
    const [expiryTimer, setExpiryTimer] = useState(600) // 10 minutes
    const [canResend, setCanResend] = useState(false)

    // Refs for OTP inputs
    const otpRefs = useRef([])

    // Timer Logic
    useEffect(() => {
        let interval;
        if (step === 2) {
            interval = setInterval(() => {
                if (resendTimer > 0) setResendTimer(prev => prev - 1);
                else setCanResend(true);

                if (expiryTimer > 0) setExpiryTimer(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [step, resendTimer, expiryTimer]);

    // Step 1: Send OTP
    async function handleSendOtp(e) {
        if (e) e.preventDefault();
        setError("")
        setLoading(true)
        try {
            await api.sendOtp(email)
            setStep(2)
            setResendTimer(30)
            setExpiryTimer(600)
            setCanResend(false)
        } catch (e) {
            console.error(e)
            setError(e.message || "Failed to send OTP")
        }
        setLoading(false)
    }

    // Handle OTP Input
    const handleOtpChange = (index, value) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next
        if (value && index < 5) {
            otpRefs.current[index + 1].focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        // Backspace behavior (Previous fix was buggy if deleting empty, fixed logic here)
        if (e.key === "Backspace") {
            if (!otp[index] && index > 0) {
                // If empty, move back and delete that
                otpRefs.current[index - 1].focus();
            }
        }
    }

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").slice(0, 6).split("");
        if (pastedData.every(char => !isNaN(char))) {
            const newOtp = [...otp];
            pastedData.forEach((val, i) => {
                newOtp[i] = val;
            });
            setOtp(newOtp);
            // Focus the last filled input or the next empty one
            const nextIndex = Math.min(pastedData.length, 5);
            if (otpRefs.current[nextIndex]) {
                otpRefs.current[nextIndex].focus();
            }
        }
    };

    // Step 2: Verify OTP
    async function handleVerifyOtp(e) {
        e.preventDefault()
        const otpCode = otp.join("")
        if (otpCode.length !== 6) return setError("Please enter a 6-digit code");

        setError("")
        setLoading(true)
        try {
            await api.verifyOtp(email, otpCode)
            setStep(3)
        } catch (e) {
            console.error(e)
            setError("Invalid OTP. Please try again.")
        }
        setLoading(false)
    }

    // Helper for formatting time
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // Password Validation
    const passwordCriteria = {
        length: password.length >= 6,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*]/.test(password)
    };

    // User requested: 6 chars, 1 upper, 1 lower, 1 number.
    const isPasswordStrong = passwordCriteria.length && passwordCriteria.upper && passwordCriteria.lower && passwordCriteria.number;
    const doPasswordsMatch = password === confirmPassword;
    const isFormValid = isPasswordStrong && doPasswordsMatch;


    // Step 3: Create Account
    async function handleSignup(e) {
        e.preventDefault()

        if (!isPasswordStrong) return setError("Please meet all password requirements.");
        if (!doPasswordsMatch) return setError("Passwords do not match.");

        setError("")
        setLoading(true)
        try {
            // Create in Firebase
            const result = await signup(email, password)
            const user = result.user

            // Update Profile with Name
            await updateProfile(user, {
                displayName: `${firstName} ${lastName}`.trim()
            })

            navigate("/")
        } catch (e) {
            console.error(e)
            setError(e.message || "Failed to create account")
        }
        setLoading(false)
    }

    return (
        <div style={{ maxWidth: '440px', margin: '4rem auto', fontFamily: 'Inter, sans-serif' }}>
            <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>

                {/* Visual Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                    {[1, 2, 3].map((s, i) => (
                        <React.Fragment key={s}>
                            <div style={{
                                width: '2rem', height: '2rem', borderRadius: '50%',
                                background: step >= s ? '#7c3aed' : 'rgba(255,255,255,0.1)', // Purple accent
                                color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.9rem', fontWeight: 'bold',
                                transition: 'all 0.3s ease'
                            }}>
                                {step > s ? '✓' : s}
                            </div>
                            {i < 2 && <div style={{ height: '2px', width: '3rem', background: step > s ? '#7c3aed' : 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }} />}
                        </React.Fragment>
                    ))}
                </div>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>

                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                        {step === 1 && "Create Account"}
                        {step === 2 && "Check Your Email"}
                        {step === 3 && "Complete Your Profile"}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {step === 1 && "Enter your email to get started"}
                        {step === 2 && `We've sent a code to ${email}`}
                        {step === 3 && "Just a few more details to get started"}
                    </p>
                </div>

                {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '0.8rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                {step === 1 && (
                    <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <div style={{ textAlign: 'left' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoFocus
                                placeholder="name@example.com"
                                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem' }}
                            />
                        </div>
                        <button disabled={loading} type="submit" style={{ marginTop: '0.5rem', background: 'linear-gradient(90deg, #7c3aed 0%, #4f46e5 100%)', color: 'white', padding: '0.9rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '1rem' }}>
                            {loading ? "Sending..." : "Send Verification Code"}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
                            {otp.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={el => otpRefs.current[i] = el}
                                    type="text"
                                    value={digit}
                                    onChange={e => handleOtpChange(i, e.target.value)}
                                    onKeyDown={e => handleOtpKeyDown(i, e)}
                                    onPaste={handleOtpPaste}
                                    maxLength="1"
                                    style={{
                                        width: '3rem',
                                        height: '3.5rem', // Keep height but reduce fontsize/padding if needed. Actually if it cuts off, it might be padding.
                                        padding: 0, // Explicitly remove padding to prevent cutoff
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', // Flex center text
                                        borderRadius: '0.8rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        color: 'white',
                                        textAlign: 'center',
                                        fontSize: '1.5rem',
                                        fontWeight: 'bold',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            ))}
                        </div>
                        <button disabled={loading} type="submit" style={{ background: 'linear-gradient(90deg, #7c3aed 0%, #4f46e5 100%)', color: 'white', padding: '0.9rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '1rem' }}>
                            {loading ? "Verifying..." : "Verify Email"}
                        </button>

                        <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            <p style={{ marginBottom: '0.5rem' }}>Code expires in: <span style={{ color: '#fff' }}>{formatTime(expiryTimer)}</span></p>

                            Didn't receive the email? <br />
                            {canResend ? (
                                <span onClick={() => handleSendOtp()} style={{ color: '#7c3aed', cursor: 'pointer', fontWeight: '600' }}>Resend Code</span>
                            ) : (
                                <span style={{ opacity: 0.7 }}>Resend enabled in {resendTimer}s</span>
                            )}
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 120px', textAlign: 'left' }}>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>First Name <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    required
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                />
                            </div>
                            <div style={{ flex: '1 1 120px', textAlign: 'left' }}>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Last Name</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                />
                            </div>
                        </div>

                        <div style={{ textAlign: 'left' }}>
                            {/* Email Field (Read Only) */}
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Email Address</label>
                            <input
                                type="text"
                                value={email}
                                disabled
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'gray' }}
                            />
                        </div>

                        <div style={{ textAlign: 'left' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Password <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                placeholder="Create a strong password"
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                            />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Confirm Password <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Retype your password"
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                            />
                        </div>

                        {/* Password Strength Meter */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.5rem' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Enter a password to see strength</p>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <li style={{ color: passwordCriteria.length ? '#10b981' : '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>{passwordCriteria.length ? '✓' : '○'}</span> At least 6 characters
                                </li>
                                <li style={{ color: passwordCriteria.upper ? '#10b981' : '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>{passwordCriteria.upper ? '✓' : '○'}</span> One uppercase letter
                                </li>
                                <li style={{ color: passwordCriteria.lower ? '#10b981' : '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>{passwordCriteria.lower ? '✓' : '○'}</span> One lowercase letter
                                </li>
                                <li style={{ color: passwordCriteria.number ? '#10b981' : '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>{passwordCriteria.number ? '✓' : '○'}</span> One number
                                </li>
                                <li style={{ color: doPasswordsMatch && password.length > 0 ? '#10b981' : '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <span>{doPasswordsMatch && password.length > 0 ? '✓' : '○'}</span> Passwords match
                                </li>
                            </ul>
                        </div>

                        <button disabled={loading || !isFormValid} type="submit" style={{ marginTop: '0.5rem', background: isFormValid ? 'linear-gradient(90deg, #7c3aed 0%, #4f46e5 100%)' : '#374151', color: isFormValid ? 'white' : '#9ca3af', padding: '0.9rem', borderRadius: '0.5rem', border: 'none', cursor: isFormValid ? 'pointer' : 'not-allowed', fontWeight: '600', fontSize: '1rem' }}>
                            Create Account
                        </button>
                    </form>
                )}

                <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Already have an account? <Link to="/login" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: '600' }}>Sign In</Link>
                </div>
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>← Back to Home</Link>
                </div>
            </div>
        </div>
    )
}
