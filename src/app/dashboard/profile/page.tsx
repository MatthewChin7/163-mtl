'use client';

import { useState } from 'react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/store';
import { UserRole, RoleRequest } from '@/types';
import { Save, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const router = useRouter();
    const user = auth.getCurrentUser();

    // Form State
    const [formData, setFormData] = useState({
        name: user?.name || '',
        rank: user?.rank || '',
        email: user?.email || '',
        unit: user?.unit || ''
    });

    // Role Request State
    const [requestedRole, setRequestedRole] = useState<UserRole>('REQUESTOR');
    const [requestSent, setRequestSent] = useState(false);

    if (!user) return <div>Access Denied</div>;

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        db.users.update(user.id, formData);
        alert("Profile updated successfully");
        router.refresh(); // Refresh to update sidebar if name changed
    };

    const handleRequestRole = () => {
        const newRequest: RoleRequest = {
            id: crypto.randomUUID(),
            userId: user.id,
            userName: user.name,
            currentRole: user.role,
            requestedRole: requestedRole,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        };
        db.roleRequests.add(newRequest);
        setRequestSent(true);
        alert("Role change request sent to Ops Controller.");
    };

    // Check for existing pending requests
    const pendingRequest = db.roleRequests.getAll().find(r => r.userId === user.id && r.status === 'PENDING');

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '2rem' }}>My Profile</h1>

            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Personal Information</h2>
                <form onSubmit={handleSaveProfile} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label className="text-xs font-semibold uppercase text-gray-500">Rank</label>
                        <input className="input" value={formData.rank} onChange={e => setFormData({ ...formData, rank: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="text-xs font-semibold uppercase text-gray-500">Name</label>
                        <input className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="text-xs font-semibold uppercase text-gray-500">Email / ID</label>
                        <input className="input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="text-xs font-semibold uppercase text-gray-500">Unit</label>
                        <input className="input" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} />
                    </div>

                    <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button type="submit" className="btn btn-primary">
                            <Save size={18} /> Save Changes
                        </button>
                    </div>
                </form>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', borderColor: 'var(--accent-primary)', borderWidth: '1px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldAlert size={20} className="text-primary" /> Role Management
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--fg-secondary)' }}>Current Role</div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user.role}</div>
                    </div>

                    {pendingRequest ? (
                        <div style={{ color: 'var(--status-warning)', fontWeight: 600 }}>
                            Pending Request: {pendingRequest.requestedRole}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <select
                                className="input"
                                style={{ width: 'auto' }}
                                value={requestedRole}
                                onChange={(e) => setRequestedRole(e.target.value as UserRole)}
                            >
                                <option value="REQUESTOR">Requestor</option>
                                <option value="APPROVER_AS3">Approver (AS3)</option>
                                <option value="APPROVER_S3">Approver (S3)</option>
                                <option value="APPROVER_MTC">Approver (MTC)</option>
                            </select>
                            <button className="btn btn-primary" onClick={handleRequestRole}>Request Change</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
