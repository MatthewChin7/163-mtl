'use client';

import { useState } from 'react';
import { User } from '@/types';
import { db } from '@/lib/store';
import { auth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginView() {
    const router = useRouter();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const users = db.users.getAll();

    const handleLogin = () => {
        if (selectedUser) {
            auth.login(selectedUser.id);
            router.push('/dashboard');
        }
    };

    return (
        <div className="login-container" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top right, #1e1b4b, var(--bg-app))'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '480px',
                padding: '3rem',
                animation: 'fadeIn 0.5s ease-out'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>163MTL</h1>
                    <p style={{ color: 'var(--fg-secondary)' }}>Transport Management Portal</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--fg-secondary)', fontWeight: 500 }}>Select Role to Simulate</label>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {users.map(user => (
                            <button
                                key={user.id}
                                onClick={() => setSelectedUser(user)}
                                style={{
                                    textAlign: 'left',
                                    padding: '1rem',
                                    background: selectedUser?.id === user.id ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-surface)',
                                    border: `1px solid ${selectedUser?.id === user.id ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--fg-primary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 600 }}>{user.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)' }}>{user.rank} • {user.role}</div>
                                </div>
                                {selectedUser?.id === user.id && (
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-primary)' }} />
                                )}
                            </button>
                        ))}
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={handleLogin}
                        disabled={!selectedUser}
                        style={{ marginTop: '1rem', width: '100%', height: '3rem', fontSize: '1rem' }}
                    >
                        Enter System
                    </button>
                </div>
            </div>
        </div>
    );
}
