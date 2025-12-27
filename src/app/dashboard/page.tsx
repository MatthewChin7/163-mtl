'use client';

import { auth } from '@/lib/auth';
import { db } from '@/lib/store';
import { useEffect, useState } from 'react';
import { Indent } from '@/types';
import Link from 'next/link';
import { Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import IndentList from '@/components/indents/IndentList';

export default function DashboardPage() {
    const [indents, setIndents] = useState<Indent[]>([]);
    const user = auth.getCurrentUser();

    useEffect(() => {
        // In a real app, we'd fetch from API
        setIndents(db.indents.getAll());
    }, []);

    if (!user) return null;

    return (
        <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Welcome back, {user.rank} {user.name}</h1>
                    <p style={{ color: 'var(--fg-secondary)' }}>Here is what's happening today.</p>
                </div>
                {user.role === 'REQUESTOR' && (
                    <Link href="/dashboard/new-indent" className="btn btn-primary">
                        <Plus size={18} /> New Indent
                    </Link>
                )}
            </header>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                {[
                    { label: 'Pending Approval', value: indents.filter(i => i.status.includes('PENDING')).length, icon: Clock, color: 'var(--status-warning)' },
                    { label: 'Approved', value: indents.filter(i => i.status === 'APPROVED').length, icon: CheckCircle, color: 'var(--status-success)' },
                    { label: 'Rejected/Cancelled', value: indents.filter(i => ['REJECTED', 'CANCELLED'].includes(i.status)).length, icon: XCircle, color: 'var(--status-danger)' },
                ].map(stat => (
                    <div key={stat.label} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: `${stat.color}20`, padding: '0.75rem', borderRadius: 'var(--radius-md)', color: stat.color }}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stat.value}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--fg-secondary)' }}>{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {indents.length === 0 ? (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                    <div style={{ marginBottom: '1rem', fontSize: '3rem' }}>🚛</div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Indents Found</h3>
                    <p style={{ color: 'var(--fg-secondary)', marginBottom: '1.5rem' }}>Get started by creating your first transport request.</p>
                    {user.role === 'REQUESTOR' && (
                        <Link href="/dashboard/new-indent" className="btn btn-primary">
                            Create Indent
                        </Link>
                    )}
                </div>
            ) : (
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontWeight: 600 }}>
                            {user.role.startsWith('APPROVER') ? 'Pending Approvals & Recent' : 'Your Indents'}
                        </h3>
                        <Link href="/dashboard/indents" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '0.875rem' }}>View All →</Link>
                    </div>
                    <IndentList
                        indents={indents}
                        user={user}
                        refreshData={() => setIndents(db.indents.getAll())} // Simple re-fetch
                    />
                </div>
            )}
        </div>
    );
}
