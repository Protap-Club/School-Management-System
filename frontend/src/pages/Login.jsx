import React, { useCallback, useState, useEffect } from 'react';
import { useAuth } from '../features/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaUser, FaLock } from 'react-icons/fa';

const VALID_ROLES = ['super_admin', 'admin', 'teacher'];

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Check for "expired" message in URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('expired')) {
            setError('Session expired. Please login again.');
        }
    }, [location.search]);

    const validateForm = () => {
        if (!email) {
            setError('Email is required');
            return false;
        }
        if (!password) {
            setError('Password is required');
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address.');
            return false;
        }
        return true;
    };

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            const user = await login(email, password);
            if (user && VALID_ROLES.includes(user.role)) {
                // If there was a redirect location, go there, otherwise dashboard
                const from = location.state?.from?.pathname || '/dashboard';
                navigate(from, { replace: true });
            } else {
                setError('Unauthorized role allocation.');
            }
        } catch (err) {
            if (err.response?.status === 401) {
                setError('Invalid Credentials');
            } else {
                // For other errors, we can keep a hidden log for debugging but remove the loud console.error
                setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [email, password, login, navigate, location]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-32 left-20 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl w-full max-w-md p-8 relative z-10 border border-white/50">
                <div className="text-center mb-10">
                    <img src="/public/protap.png" alt="Protap Logo" className="w-20 h-20 mx-auto mb-4 object-contain" />
                    <h2 className="text-3xl font-bold text-gray-800">Welcome Back</h2>
                    <p className="text-gray-500 mt-2">Sign in to access your portal</p>
                </div>
                {error && (
                    <div className={`p-3 rounded-lg mb-6 text-sm flex items-center justify-center ${error.includes('expired')
                        ? 'bg-blue-50 text-blue-600 border border-blue-100'
                        : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaUser className="text-gray-400" /></div>
                        <input type="email" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:bg-white disabled:opacity-50"
                            placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isSubmitting} />
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaLock className="text-gray-400" /></div>
                        <input type="password" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:bg-white disabled:opacity-50"
                            placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isSubmitting} />
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Signing In...
                            </span>
                        ) : 'Sign In'}
                    </button>
                </form>
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>Protected by Enterprise Grade Security</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
