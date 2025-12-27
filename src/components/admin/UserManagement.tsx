'use client';

import { useState, useEffect } from 'react';
import { User, UserRole, RoleRequest } from '@/types';
import { db } from '@/lib/store';
import { Plus, Shield, CheckCircle, XCircle, Trash2, Edit } from 'lucide-react';

interface UserManagementProps {
    currentUser: User;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
    // Local state for users list, mimicking a fetch from DB
    const [users, setUsers] = useState<User[]>([]);
    const [requests, setRequests] = useState<RoleRequest[]>([]); // Added requests state

    // Add User State
    const [isAdding, setIsAdding] = useState(false);
    const [newUser, setNewUser] = useState<Partial<User>>({
        role: 'REQUESTOR',
        name: '',
        email: '',
        rank: '',
        unit: '163 SQN'
    });

    // Edit Role State
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [tempRole, setTempRole] = useState<UserRole>('REQUESTOR');

    // Load data on mount
    useEffect(() => {
        setUsers(db.users.getAll());
        setRequests(db.roleRequests.getAll()); // Load requests
    }, []);

    const refreshUsers = () => {
        setUsers([...db.users.getAll()]);
        setRequests([...db.roleRequests.getAll()]); // Refresh requests
    };

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.name || !newUser.email) return;

        const userToAdd: User = {
            id: crypto.randomUUID(),
            name: newUser.name,
            email: newUser.email,
            role: newUser.role as UserRole,
            rank: newUser.rank || '',
            unit: newUser.unit || '163 SQN'
        };

        db.users.add(userToAdd);
        setIsAdding(false);
        setNewUser({ role: 'REQUESTOR', name: '', email: '', rank: '', unit: '163 SQN' });
        refreshUsers();
        alert('User added successfully');
    };

    const handleUpdateRole = (userId: string) => {
        const user = db.users.getById(userId);
        if (user) {
            user.role = tempRole;
            alert(`User role updated to ${tempRole}`);
        }
        setEditingUserId(null);
        refreshUsers();
    };

    const handleApproveRequest = (req: RoleRequest) => {
        if (!confirm(`Approve role change for ${req.userName} to ${req.requestedRole}?`)) return;

        // 1. Update User Role
        const user = db.users.getById(req.userId);
        if (user) {
            user.role = req.requestedRole;
        }

        // 2. Mark Request Logic
        req.status = 'APPROVED';

        refreshUsers();
    };

    const handleRejectRequest = (req: RoleRequest) => {
        if (!confirm("Reject request?")) return;
        req.status = 'REJECTED';
        refreshUsers();
    };

    const canAddUsers = currentUser.role === 'ADMIN' || currentUser.role === 'APPROVER_MTC';

    // Logic: MTC can only add MTC. Ops Controller (ADMIN) can add others.
    const availableRoles: UserRole[] = currentUser.role === 'APPROVER_MTC'
        ? ['APPROVER_MTC']
        : ['REQUESTOR', 'APPROVER_AS3', 'APPROVER_S3', 'APPROVER_MTC', 'ADMIN'];

    const pendingRequests = requests.filter(r => r.status === 'PENDING');

    return (
        <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Shield size={24} className="text-primary" />
                        {currentUser.role === 'ADMIN' ? '163 Ops Controller Panel' : 'MTC User Management'}
                    </h2>
                    <p style={{ color: 'var(--fg-secondary)', marginTop: '0.25rem' }}>
                        {currentUser.role === 'ADMIN'
                            ? 'Manage all platform accounts and roles.'
                            : 'Manage MTC personnel accounts.'}
                    </p>
                </div>
                {canAddUsers && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsAdding(!isAdding)}
                    >
                        <Plus size={18} /> Add User
                    </button>
                )}
            </div>

            {/* Role Requests Section - ADMIN Only */}
            {currentUser.role === 'ADMIN' && pendingRequests.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--status-warning)' }}>
                        Pending Role Requests ({pendingRequests.length})
                    </h3>
                    <div className="glass-panel" style={{ background: 'var(--bg-surface)' }}>
                        {pendingRequests.map(req => (
                            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{req.userName}</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--fg-secondary)' }}>
                                        Requesting: <span style={{ fontWeight: 700, color: 'var(--fg-primary)' }}>{req.requestedRole}</span> (from {req.currentRole})
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn btn-primary" style={{ padding: '0.4rem', background: 'var(--status-success)', color: 'white' }} onClick={() => handleApproveRequest(req)}>
                                        <CheckCircle size={18} />
                                    </button>
                                    <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--status-danger)' }} onClick={() => handleRejectRequest(req)}>
                                        <XCircle size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isAdding && (
                <form onSubmit={handleAddUser} className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Register New User</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="form-group">
                            <label className="text-xs font-semibold uppercase text-gray-500">Name</label>
                            <input className="input" placeholder="e.g. Tan Ah Kao" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="text-xs font-semibold uppercase text-gray-500">Email / ID</label>
                            <input className="input" placeholder="e.g. tan@163.mil" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="text-xs font-semibold uppercase text-gray-500">Rank</label>
                            <input className="input" placeholder="e.g. LCP" value={newUser.rank} onChange={e => setNewUser({ ...newUser, rank: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="text-xs font-semibold uppercase text-gray-500">Role</label>
                            <select className="input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
                                {availableRoles.map(r => (
                                    <option key={r} value={r}>{r === 'ADMIN' ? 'OPS CONTROLLER' : r}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="text-xs font-semibold uppercase text-gray-500">Unit</label>
                            <input className="input" placeholder="e.g. 163 SQN" value={newUser.unit} onChange={e => setNewUser({ ...newUser, unit: e.target.value })} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button type="button" className="btn btn-ghost" onClick={() => setIsAdding(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Create Account</button>
                    </div>
                </form>
            )}

            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--bg-surface)' }}>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--fg-secondary)' }}>Rank / Name</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--fg-secondary)' }}>Role</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--fg-secondary)' }}>Email</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--fg-secondary)' }}>Unit</th>
                            {currentUser.role === 'ADMIN' && <th style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--fg-secondary)' }}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                <td style={{ padding: '1rem', fontWeight: 500 }}>
                                    <span style={{ color: 'var(--fg-secondary)', marginRight: '0.5rem' }}>{user.rank}</span>
                                    {user.name}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    {editingUserId === user.id ? (
                                        <select
                                            className="input"
                                            style={{ padding: '0.25rem' }}
                                            value={tempRole}
                                            onChange={(e) => setTempRole(e.target.value as UserRole)}
                                        >
                                            <option value="REQUESTOR">Requestor</option>
                                            <option value="APPROVER_AS3">Approver (AS3)</option>
                                            <option value="APPROVER_S3">Approver (S3)</option>
                                            <option value="APPROVER_MTC">Approver (MTC)</option>
                                            <option value="ADMIN">Ops Controller</option>
                                        </select>
                                    ) : (
                                        <span style={{
                                            background: user.role === 'ADMIN' ? 'var(--primary)' : 'var(--bg-surface)',
                                            color: user.role === 'ADMIN' ? 'white' : 'var(--fg-primary)',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            border: user.role !== 'ADMIN' ? '1px solid var(--border-subtle)' : 'none'
                                        }}>
                                            {user.role === 'ADMIN' ? 'OPS CONTROLLER' : user.role.replace('APPROVER_', '')}
                                        </span>
                                    )}
                                </td>
                                <td style={{ padding: '1rem', color: 'var(--fg-secondary)', fontFamily: 'monospace' }}>{user.email}</td>
                                <td style={{ padding: '1rem', color: 'var(--fg-secondary)' }}>{user.unit}</td>
                                {currentUser.role === 'ADMIN' && (
                                    <td style={{ padding: '1rem' }}>
                                        {editingUserId === user.id ? (
                                            <div className="flex gap-2">
                                                <button className="text-xs btn-primary px-2 py-1 rounded" onClick={() => handleUpdateRole(user.id)}>Save</button>
                                                <button className="text-xs opacity-60 ml-2" onClick={() => setEditingUserId(null)}>Cancel</button>
                                            </div>
                                        ) : (
                                            <button
                                                className="opacity-50 hover:opacity-100"
                                                onClick={() => { setEditingUserId(user.id); setTempRole(user.role); }}
                                                title="Edit Role"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
