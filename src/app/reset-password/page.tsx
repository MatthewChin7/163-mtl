'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { resetPassword } from '@/app/actions/auth-reset';
import { KeyRound, ArrowLeft } from 'lucide-react';

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('ERROR');
            setErrorMessage('Missing or invalid token.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match.');
            return;
        }
        if (!token) return;

        setStatus('LOADING');
        setErrorMessage('');

        const res = await resetPassword(token, password);

        if (res.success) {
            setStatus('SUCCESS');
        } else {
            setStatus('ERROR');
            setErrorMessage(res.error || 'Failed to reset password.');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-app)',
            padding: '1rem'
        }}>
            <div className="glass-panel" style={{ padding: '2.5rem', width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '48px', height: '48px', background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1rem auto', color: 'var(--primary)'
                    }}>
                        <KeyRound size={24} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Set New Password</h1>
                    <p style={{ color: 'var(--fg-secondary)', fontSize: '0.875rem' }}>
                        Must be at least 6 characters.
                    </p>
                </div>

                {status === 'SUCCESS' ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ padding: '1rem', background: '#ecfdf5', color: '#047857', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                            Password reset successfully!
                        </div>
                        <Link href="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                            Back to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group mb-4">
                            <label className="text-xs font-semibold uppercase text-gray-500 mb-1 block">New Password</label>
                            <input
                                type="password"
                                className="input w-full"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                disabled={status === 'LOADING' || !token}
                            />
                        </div>
                        <div className="form-group mb-4">
                            <label className="text-xs font-semibold uppercase text-gray-500 mb-1 block">Confirm Password</label>
                            <input
                                type="password"
                                className="input w-full"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                disabled={status === 'LOADING' || !token}
                            />
                        </div>

                        {status === 'ERROR' && (
                            <div style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>
                                {errorMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary w-full justify-center mb-4"
                            disabled={status === 'LOADING' || !token}
                        >
                            {status === 'LOADING' ? 'Resetting...' : 'Reset Password'}
                        </button>

                        <div className="text-center">
                            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 flex items-center justify-center gap-1">
                                <ArrowLeft size={14} /> Back to log in
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
