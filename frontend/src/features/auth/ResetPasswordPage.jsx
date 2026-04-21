import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaCheck, FaTimes, FaEye, FaEyeSlash, FaCheckCircle } from 'react-icons/fa';
import { authApi } from '../auth/api/api.js';
import { useToastMessage } from '../../hooks/useToastMessage.js';

const OTP_EXPIRY_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 30;
const OTP_LENGTH = 6;

// ─── Toast ──────────────────────────────────────────────────────────
const Toast = ({ message }) => {
    if (!message) return null;
    const isSuccess = message.type === 'success';
    return (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2.5 animate-fadeIn text-sm font-medium ${isSuccess ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {isSuccess ? <FaCheck size={11} /> : <FaTimes size={11} />}
            <span>{message.text}</span>
        </div>
    );
};

// ─── OTP Input (6 individual clean inputs, no card/border wrapper) ──
const OtpInput = ({ value, onChange, disabled }) => {
    const inputRefs = useRef([]);
    const digits = value.padEnd(OTP_LENGTH, '').split('').slice(0, OTP_LENGTH);

    useEffect(() => {
        if (inputRefs.current[0]) inputRefs.current[0].focus();
    }, []);

    const handleChange = (index, inputValue) => {
        if (disabled) return;
        const char = inputValue.replace(/\D/g, '').slice(-1);
        const newDigits = [...digits];
        newDigits[index] = char;
        onChange(newDigits.join('').replace(/\s/g, ''));
        if (char && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index, e) => {
        if (disabled) return;
        if (e.key === 'Backspace') {
            e.preventDefault();
            const newDigits = [...digits];
            if (newDigits[index]) {
                newDigits[index] = '';
                onChange(newDigits.join('').replace(/\s/g, ''));
            } else if (index > 0) {
                newDigits[index - 1] = '';
                onChange(newDigits.join('').replace(/\s/g, ''));
                inputRefs.current[index - 1]?.focus();
            }
        }
        if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
        if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    };

    const handlePaste = (e) => {
        if (disabled) return;
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
        if (pasted) {
            onChange(pasted);
            inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
        }
    };

    return (
        <div className="flex items-center justify-center gap-3">
            {Array.from({ length: OTP_LENGTH }, (_, i) => (
                <input
                    key={i}
                    ref={el => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digits[i]?.trim() || ''}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    disabled={disabled}
                    autoComplete="one-time-code"
                    className={`
                        w-11 h-12 text-center text-lg font-semibold rounded-lg
                        bg-transparent text-slate-900 transition-all duration-150 outline-none
                        disabled:opacity-40 disabled:cursor-not-allowed
                        border-b-2
                        ${digits[i]?.trim()
                            ? 'border-blue-500'
                            : 'border-slate-200'
                        }
                        focus:border-blue-500
                    `}
                    style={{ caretColor: 'transparent' }}
                />
            ))}
        </div>
    );
};

// ─── Password Strength Bar ──────────────────────────────────────────
const StrengthBar = ({ password }) => {
    const strength = useMemo(() => {
        let s = 0;
        if (password.length >= 8) s++;
        if (password.length >= 12) s++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++;
        if (/[0-9]/.test(password)) s++;
        if (/[^a-zA-Z0-9]/.test(password)) s++;
        return Math.min(s, 4);
    }, [password]);

    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
    const textColors = ['', 'text-red-600', 'text-yellow-600', 'text-blue-600', 'text-green-600'];

    if (!password) return null;

    return (
        <div className="mt-2.5">
            <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${strength >= i ? colors[strength] : 'bg-slate-100'}`} />
                ))}
            </div>
            <span className={`text-xs font-medium ${textColors[strength]}`}>{labels[strength]}</span>
        </div>
    );
};


// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════
const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const tokenFromUrl = searchParams.get('token') || '';
    const emailFromUrl = searchParams.get('email') || '';

    const { message: toast, showMessage } = useToastMessage(4000);

    const isLinkMode = !!tokenFromUrl;
    const [email] = useState(emailFromUrl);
    const [token] = useState(tokenFromUrl);

    // OTP state
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(isLinkMode ? 'password' : 'otp'); // 'otp' | 'password' | 'done'

    // Password state
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPw, setShowPw] = useState(false);

    // UI state
    const [loading, setLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);

    // Timers
    const [expiry, setExpiry] = useState(OTP_EXPIRY_SECONDS);
    const [resendCd, setResendCd] = useState(RESEND_COOLDOWN_SECONDS);
    const isExpired = expiry <= 0;

    // ── Expiry countdown ────────────────────────────────────────────
    useEffect(() => {
        if (step !== 'otp' || isExpired) return;
        const t = setInterval(() => setExpiry(p => {
            if (p <= 1) { clearInterval(t); return 0; }
            return p - 1;
        }), 1000);
        return () => clearInterval(t);
    }, [step, isExpired]);

    // ── Resend cooldown ─────────────────────────────────────────────
    useEffect(() => {
        if (resendCd <= 0) return;
        const t = setInterval(() => setResendCd(p => {
            if (p <= 1) { clearInterval(t); return 0; }
            return p - 1;
        }), 1000);
        return () => clearInterval(t);
    }, [resendCd]);

    const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    // ── Resend OTP ──────────────────────────────────────────────────
    const handleResend = useCallback(async () => {
        if (resendCd > 0 || !email || isResending) return;
        setIsResending(true);
        try {
            await authApi.forgotPassword({ email, method: 'otp' });
            setOtp('');
            setExpiry(OTP_EXPIRY_SECONDS);
            setResendCd(RESEND_COOLDOWN_SECONDS);
            showMessage('success', 'New code sent to your email');
        } catch (err) {
            showMessage('error', err.response?.data?.message || 'Failed to resend code');
        } finally {
            setIsResending(false);
        }
    }, [resendCd, email, isResending, showMessage]);

    // ── Submit handler ──────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        // ── Link-based: set password directly ───────────────────────
        if (isLinkMode && step === 'password') {
            if (!token) { showMessage('error', 'Invalid reset link'); return; }
            if (password.length < 8) { showMessage('error', 'Password must be at least 8 characters'); return; }
            if (password !== confirmPassword) { showMessage('error', 'Passwords do not match'); return; }

            setLoading(true);
            try {
                await authApi.resetPassword({ token, newPassword: password });
                setStep('done');
                showMessage('success', 'Password updated successfully');
                setTimeout(() => navigate('/login'), 2500);
            } catch (err) {
                showMessage('error', err.response?.data?.error?.message || err.response?.data?.message || 'Reset failed');
            } finally {
                setLoading(false);
            }
            return;
        }

        // ── OTP step: validate format → move to password step ───────
        if (step === 'otp') {
            if (otp.length !== OTP_LENGTH) { showMessage('error', 'Enter the full 6-digit code'); return; }
            if (isExpired) { showMessage('error', 'Code expired — request a new one'); return; }
            setStep('password');
            showMessage('success', 'Code accepted');
            return;
        }

        // ── Password step (OTP flow): submit to backend ─────────────
        if (step === 'password') {
            if (password.length < 8) { showMessage('error', 'Password must be at least 8 characters'); return; }
            if (password !== confirmPassword) { showMessage('error', 'Passwords do not match'); return; }

            setLoading(true);
            try {
                await authApi.resetPasswordWithOtp({ email, otp, newPassword: password });
                setStep('done');
                showMessage('success', 'Password updated successfully');
                setTimeout(() => navigate('/login'), 2500);
            } catch (err) {
                const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Reset failed';
                if (msg.toLowerCase().includes('too many')) {
                    showMessage('error', 'Too many attempts — request a new code');
                } else if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('expired')) {
                    showMessage('error', 'Invalid or expired code');
                    setStep('otp');
                    setOtp('');
                } else {
                    showMessage('error', msg);
                }
            } finally {
                setLoading(false);
            }
        }
    };

    // ── Back handler ────────────────────────────────────────────────
    const handleBack = () => {
        if (step === 'password' && !isLinkMode) {
            setStep('otp');
            setPassword('');
            setConfirmPassword('');
        } else {
            navigate('/forgot-password');
        }
    };

    // ═════════════════════════════════════════════════════════════════
    // Render
    // ═════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4">
            <Toast message={toast} />

            <div className="w-full max-w-[380px]">
                {/* ── Back button (always visible unless done) ──────── */}
                {step !== 'done' && (
                    <button
                        onClick={handleBack}
                        className="inline-flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-slate-600 font-medium mb-8 transition-colors"
                    >
                        <FaArrowLeft className="text-[10px]" />
                        Back
                    </button>
                )}

                {/* ═══ OTP Step ═══════════════════════════════════════ */}
                {step === 'otp' && (
                    <form onSubmit={handleSubmit}>
                        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight mb-1.5">
                            Check your email
                        </h1>
                        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                            We sent a code to <span className="font-medium text-slate-700">{email || 'your email'}</span>
                        </p>

                        {/* OTP Inputs — directly on the page, no card */}
                        <div className="mb-6">
                            <OtpInput value={otp} onChange={setOtp} disabled={loading || isExpired} />
                        </div>

                        {/* Info row */}
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-6">
                            <span>
                                {isExpired
                                    ? <span className="text-red-500 font-medium">Code expired</span>
                                    : <>Expires in <span className={`font-medium ${expiry <= 60 ? 'text-red-500' : 'text-slate-600'}`}>{fmt(expiry)}</span></>
                                }
                            </span>
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resendCd > 0 || isResending}
                                className="text-blue-600 hover:text-blue-700 disabled:text-slate-300 disabled:cursor-default font-medium transition-colors"
                            >
                                {isResending ? 'Sending...' : resendCd > 0 ? `Resend in ${resendCd}s` : 'Resend code'}
                            </button>
                        </div>

                        {/* Verify Button */}
                        <button
                            type="submit"
                            disabled={loading || otp.length !== OTP_LENGTH || isExpired}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Verify
                        </button>

                        {/* Wrong email link */}
                        <p className="text-center mt-5 text-xs text-slate-400">
                            Didn't receive it?{' '}
                            <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium">
                                Use a different email
                            </Link>
                        </p>
                    </form>
                )}

                {/* ═══ Password Step ═════════════════════════════════ */}
                {step === 'password' && (
                    <form onSubmit={handleSubmit}>
                        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight mb-1.5">
                            Set new password
                        </h1>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            Create a strong password for your account.
                        </p>

                        <div className="space-y-4 mb-6">
                            {/* New Password */}
                            <div>
                                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                                    New password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Minimum 8 characters"
                                        required
                                        minLength={8}
                                        autoFocus
                                        disabled={loading}
                                        className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(!showPw)}
                                        tabIndex={-1}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPw ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                    </button>
                                </div>
                                <StrengthBar password={password} />
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                                    Confirm password
                                </label>
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter your password"
                                    required
                                    minLength={8}
                                    disabled={loading}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                                />
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="text-xs text-red-500 mt-1.5">Passwords don't match</p>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Updating...' : 'Update password'}
                        </button>
                    </form>
                )}

                {/* ═══ Done Step ══════════════════════════════════════ */}
                {step === 'done' && (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaCheckCircle className="text-green-600 text-xl" />
                        </div>
                        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight mb-1.5">
                            Password updated
                        </h1>
                        <p className="text-sm text-slate-500 leading-relaxed mb-6">
                            Your password has been changed. Redirecting you to login…
                        </p>
                        <Link
                            to="/login"
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Go to login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;