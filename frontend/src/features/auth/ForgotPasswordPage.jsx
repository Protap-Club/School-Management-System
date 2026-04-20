import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCheckCircle, FaLock, FaEnvelope, FaTimes, FaCheck } from 'react-icons/fa';
import { authApi } from '../features/auth';
import { useToastMessage } from '../hooks/useToastMessage';

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

// ─── Loading Overlay (shown after clicking send) ────────────────────
const SendingOverlay = ({ email, method }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl px-8 py-10 max-w-sm w-full mx-4 text-center">
            {/* Spinner */}
            <div className="relative w-12 h-12 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full border-[2.5px] border-slate-100" />
                <div className="absolute inset-0 rounded-full border-[2.5px] border-blue-600 border-t-transparent animate-spin" />
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-1.5">
                {method === 'otp' ? 'Sending verification code' : 'Sending reset link'}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
                {method === 'otp'
                    ? <>A 6-digit code is being sent to <span className="font-medium text-slate-700">{email}</span></>
                    : <>A reset link is being sent to <span className="font-medium text-slate-700">{email}</span></>
                }
            </p>
        </div>
    </div>
);

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [method, setMethod] = useState('link');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const navigate = useNavigate();
    const { message: toast, showMessage } = useToastMessage(4000);

    // Email typo corrections (safe mapping)
    const correctEmailTypos = (email) => {
        if (!email || !email.includes('@')) return email;
        const [localPart, ...domainParts] = email.split('@');
        const domain = domainParts.join('@');
        const corrections = {
            'gmial.com': 'gmail.com', 'gmaill.com': 'gmail.com',
            'gmail.co': 'gmail.com', 'yahooo.com': 'yahoo.com',
            'outlook.co': 'outlook.com', 'hotmial.com': 'hotmail.com',
            'hotmai.com': 'hotmail.com'
        };
        const correctedDomain = corrections[domain.toLowerCase()];
        return correctedDomain ? `${localPart}@${correctedDomain}` : email;
    };

    const validateEmail = useCallback(() => {
        if (!email) {
            showMessage('error', 'Please enter your email address');
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMessage('error', 'Please enter a valid email address');
            return false;
        }
        return true;
    }, [email, showMessage]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!validateEmail()) return;

        // Typo correction check
        const correctedEmail = correctEmailTypos(email);
        if (correctedEmail !== email) {
            setEmail(correctedEmail);
            showMessage('info', `Did you mean ${correctedEmail}?`);
            return;
        }

        setIsSubmitting(true);
        setShowOverlay(true);

        try {
            await authApi.forgotPassword({ email: correctedEmail, method });
            showMessage('success', method === 'otp'
                ? 'Verification code sent successfully'
                : 'Reset link sent to your email'
            );

            // Auto-redirect after short delay so user sees the overlay
            if (method === 'otp') {
                setTimeout(() => {
                    navigate(`/reset-password?email=${encodeURIComponent(correctedEmail)}&method=otp`);
                }, 1500);
            } else {
                // For link method, just show success toast and stay
                setTimeout(() => {
                    setShowOverlay(false);
                    setIsSubmitting(false);
                }, 1500);
            }
        } catch (err) {
            setShowOverlay(false);
            setIsSubmitting(false);
            const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
            showMessage('error', msg);
        }
    }, [validateEmail, email, method, showMessage, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4">
            <Toast message={toast} />
            {showOverlay && <SendingOverlay email={email} method={method} />}

            <div className="w-full max-w-[380px]">
                {/* Back */}
                <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-slate-600 font-medium mb-8 transition-colors"
                >
                    <FaArrowLeft className="text-[10px]" />
                    Back to login
                </Link>

                {/* Title */}
                <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight mb-1.5">
                    Reset password
                </h1>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                    Enter your email and we'll send you instructions to reset your password.
                </p>

                <form onSubmit={handleSubmit}>
                    {/* Email */}
                    <div className="mb-5">
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                            Email address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            disabled={isSubmitting}
                            autoFocus
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                        />
                    </div>

                    {/* Method */}
                    <div className="mb-6">
                        <label className="block text-[13px] font-medium text-slate-700 mb-2">
                            Reset method
                        </label>
                        <div className="space-y-2">
                            {[
                                { id: 'link', label: 'Email me a reset link' },
                                { id: 'otp', label: 'Email me a verification code' },
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => !isSubmitting && setMethod(opt.id)}
                                    disabled={isSubmitting}
                                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-sm text-left transition-all
                                        ${method === opt.id
                                            ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        }
                                        disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                        method === opt.id ? 'border-blue-500' : 'border-slate-300'
                                    }`}>
                                        {method === opt.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                    </div>
                                    <span className="font-medium">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting || !email}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {method === 'otp' ? 'Send verification code' : 'Send reset link'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;
