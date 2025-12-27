'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/store';
import { User, RoleRequest, UserRole } from '@/types';
import { Check, X, Shield, Clock, Plus, Edit } from 'lucide-react';

interface UserManagementProps {
    currentUser: User;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

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

    useEffect(() => {
        setUsers(db.users.getAll());
        setRoleRequests(db.roleRequests.getAll());
    }, [refreshTrigger, currentUser]); // Added currentUser dependency if needed, though usually stable

    const refresh = () => setRefreshTrigger(p => p + 1);

    const handleRoleUpdate = (userId: string, newRole: UserRole) => {
        db.users.update(userId, { role: newRole });
        setEditingUserId(null);
        refresh();
    };

    const handleRequestDecision = (reqId: string, decision: 'APPROVED' | 'REJECTED') => {
        const req = roleRequests.find(r => r.id === reqId);
        if (req) {
            db.roleRequests.update(reqId, { status: decision });
            if (decision === 'APPROVED') {
                db.users.update(req.userId, { role: req.requestedRole });
            }
        }
        refresh();
    };

    const handleUserApproval = (userId: string, decision: 'ACTIVE' | 'REJECTED') => {
        db.users.update(userId, { status: decision });
        refresh();
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
            unit: newUser.unit || '163 SQN',
            status: 'ACTIVE' // Admin created users are active by default
        };

        db.users.add(userToAdd);
        setIsAdding(false);
        setNewUser({ role: 'REQUESTOR', name: '', email: '', rank: '', unit: '163 SQN' });
        refresh();
        alert('User added successfully');
    };

    const pendingRequests = roleRequests.filter(r => r.status === 'PENDING');
    const pendingUsers = users.filter(u => u.status === 'PENDING');
    const activeUsers = users.filter(u => u.status === 'ACTIVE');

    // Logic: MTC can only add MTC. Admin can add others.
    const canAddUsers = currentUser.role === 'ADMIN' || currentUser.role === 'APPROVER_MTC';
    const availableRoles: UserRole[] = currentUser.role === 'APPROVER_MTC'
        ? ['APPROVER_MTC']
        : ['REQUESTOR', 'APPROVER_AS3', 'APPROVER_S3', 'APPROVER_MTC', 'ADMIN'];

    return (
        <div className="space-y-8">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Shield size={24} className="text-primary" />
                        {currentUser.role === 'ADMIN' ? 'Admin Panel' : 'MTC User Management'}
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

            {/* Manual Add User Form */}
            {isAdding && (
                <form onSubmit={handleAddUser} className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
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
                                    <option key={r} value={r}>{r === 'ADMIN' ? 'ADMIN' : r}</option>
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

            {/* New Account Approvals */}
            {currentUser.role === 'ADMIN' && (
                <div className="glass-panel p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Clock className="text-primary" /> Pending Account Approvals
                    </h2>
                    {pendingUsers.length === 0 ? (
                        <p className="text-gray-500 italic">No pending account registrations.</p>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Name</th>
                                        <th className="px-4 py-3 text-left">Email</th>
                                        <th className="px-4 py-3 text-left">Req. Role</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingUsers.map(u => (
                                        <tr key={u.id} className="border-t border-border">
                                            <td className="px-4 py-3 font-medium">{u.name}</td>
                                            <td className="px-4 py-3 text-gray-500">{u.email}</td>
                                            <td className="px-4 py-3">{u.role}</td>
                                            <td className="px-4 py-3 text-right space-x-2">
                                                <button
                                                    onClick={() => handleUserApproval(u.id, 'ACTIVE')}
                                                    className="btn btn-sm btn-ghost text-green-600 hover:bg-green-50"
                                                >
                                                    <Check size={16} /> Approve
                                                </button>
                                                <button
                                                    onClick={() => handleUserApproval(u.id, 'REJECTED')}
                                                    className="btn btn-sm btn-ghost text-red-600 hover:bg-red-50"
                                                >
                                                    <X size={16} /> Reject
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Role Requests */}
            {currentUser.role === 'ADMIN' && (
                <div className="glass-panel p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Shield className="text-primary" /> Role Change Requests
                    </h2>
                    {pendingRequests.length === 0 ? (
                        <p className="text-gray-500 italic">No pending role requests.</p>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 text-left">User</th>
                                        <th className="px-4 py-3 text-left">Current</th>
                                        <th className="px-4 py-3 text-left">Requested</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingRequests.map(req => (
                                        <tr key={req.id} className="border-t border-border">
                                            <td className="px-4 py-3 font-medium">{req.userName}</td>
                                            <td className="px-4 py-3 text-gray-500">{req.currentRole}</td>
                                            <td className="px-4 py-3 font-semibold text-primary">{req.requestedRole}</td>
                                            <td className="px-4 py-3 text-right space-x-2">
                                                <button
                                                    onClick={() => handleRequestDecision(req.id, 'APPROVED')}
                                                    className="btn btn-sm btn-ghost text-green-600 hover:bg-green-50"
                                                >
                                                    <Check size={16} /> Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRequestDecision(req.id, 'REJECTED')}
                                                    className="btn btn-sm btn-ghost text-red-600 hover:bg-red-50"
                                                >
                                                    <X size={16} /> Reject
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* All Users */}
            <div className="glass-panel p-6">
                <h2 className="text-xl font-semibold mb-4">All Active Users</h2>
                <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 text-left">Name</th>
                                <th className="px-4 py-3 text-left">Email</th>
                                <th className="px-4 py-3 text-left">Role</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeUsers.map(u => (
                                <tr key={u.id} className="border-t border-border hover:bg-muted/50">
                                    <td className="px-4 py-3 font-medium">{u.name}</td>
                                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                                    <td className="px-4 py-3">
                                        {currentUser.role === 'ADMIN' && editingUserId === u.id ? (
                                            <select
                                                value={tempRole}
                                                onChange={(e) => setTempRole(e.target.value as UserRole)}
                                                className="input py-1 px-2 text-xs"
                                            >
                                                <option value="REQUESTOR">Requestor</option>
                                                <option value="APPROVER_AS3">AS3</option>
                                                <option value="APPROVER_S3">S3</option>
                                                <option value="APPROVER_MTC">MTC</option>
                                                <option value="ADMIN">Admin</option>
                                            </select>
                                        ) : (
                                            <span style={{
                                                background: u.role === 'ADMIN' ? 'var(--primary)' : 'var(--bg-surface)',
                                                color: u.role === 'ADMIN' ? 'white' : 'var(--fg-primary)',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                border: u.role !== 'ADMIN' ? '1px solid var(--border-subtle)' : 'none'
                                            }}>
                                                {u.role === 'ADMIN' ? 'ADMIN' : u.role.replace('APPROVER_', '')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {currentUser.role === 'ADMIN' && (
                                            editingUserId === u.id ? (
                                                <div className="flex gap-2 justify-end">
                                                    <button className="text-xs btn-primary px-2 py-1 rounded" onClick={() => handleRoleUpdate(u.id, tempRole)}>Save</button>
                                                    <button className="text-xs opacity-60" onClick={() => setEditingUserId(null)}>Cancel</button>
                                                </div>
                                            ) : (
                                                <button
                                                    className="opacity-50 hover:opacity-100"
                                                    onClick={() => { setEditingUserId(u.id); setTempRole(u.role); }}
                                                    title="Edit Role"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            )
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
