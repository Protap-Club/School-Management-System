import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import { authApi } from '../features/auth';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const validateEmail = useCallback(() => {
        if (!email) {
            setError('Email is required');
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return false;
        }
        return true;
    }, [email]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setError('');

        if (!validateEmail()) return;

        setIsSubmitting(true);
        try {
            await authApi.forgotPassword({ email });
            setIsSuccess(true);
        } catch (err) {
            setIsSuccess(true);
        } finally {
            setIsSubmitting(false);
        }
    }, [validateEmail, email]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-xl font-semibold text-slate-800">
                        {isSuccess ? 'Check Your Email' : 'Forgot Password?'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {isSuccess
                            ? 'Reset instructions have been sent'
                            : 'Enter your email to reset your password'
                        }
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    {isSuccess ? (
                        <div className="text-center py-4">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaCheckCircle className="text-green-600 text-xl" />
                            </div>
                            <p className="text-slate-600 text-sm mb-4">
                                If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                                Back to login
                            </Link>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="p-3 rounded text-sm bg-red-50 text-red-600 mb-4">
                                    {error}
                                </div>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        disabled={isSubmitting}
                                        className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                {!isSuccess && (
                    <div className="text-center mt-6">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
                        >
                            <FaArrowLeft className="text-xs" />
                            Back to login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
