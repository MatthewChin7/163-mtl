'use client';

import { useState, useEffect } from 'react';
import { getAllUsers, getPendingUsers, updateUserStatus, updateUserRole, registerUserAction, deleteUserAction, updateUserAction, getRoleRequests, updateRoleRequestStatus } from '@/app/actions/users';
import { generateImpersonationToken } from '@/app/actions/admin';
import { signIn } from 'next-auth/react';
import { User, RoleRequest, UserRole } from '@/types';
import { Check, X, Shield, Clock, Plus, Edit, Trash2, LogIn } from 'lucide-react';
import PasswordConfirmModal from './PasswordConfirmModal';

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
        loadData();
    }, [refreshTrigger, currentUser]);

    const loadData = async () => {
        // Fetch real data from server actions
        const [loadedUsers, loadedPending] = await Promise.all([
            getAllUsers(),
            getPendingUsers()
        ]);
        // Merge them for display simplicity or handle separately
        // For this UI, let's just use loadedUsers (active) + loadedPending
        // Deduplicate if needed, but getAllUsers usually returns 'ACTIVE' only in our impl.
        const all = [...loadedUsers, ...loadedPending];
        // Ensure unique by ID
        const seen = new Set();
        const unique = all.filter(u => {
            const duplicate = seen.has(u.id);
            seen.add(u.id);
            return !duplicate;
        });
        setUsers(unique as User[]);
        // Fetch Role Requests
        const loadedRequests = await getRoleRequests();
        setRoleRequests(loadedRequests as any); // Cast to handle the mapped structure
    };

    const refresh = () => setRefreshTrigger(p => p + 1);

    const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
        const res = await updateUserRole(userId, newRole);
        if (res.success) {
            setEditingUserId(null);
            refresh();
        } else {
            alert('Failed to update role');
        }
    };

    // simplified: Role Requests logic removed for now as backend doesn't support generic Request table yet
    const handleRequestDecision = async (reqId: string, decision: 'APPROVED' | 'REJECTED') => {
        const res = await updateRoleRequestStatus(reqId, decision);
        if (res.success) {
            refresh();
        } else {
            alert('Failed to process request: ' + res.error);
        }
    };

    const handleUserApproval = async (userId: string, decision: 'ACTIVE' | 'REJECTED') => {
        const res = await updateUserStatus(userId, decision);
        if (res.success) {
            refresh();
        } else {
            alert('Failed to update status');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        const res = await deleteUserAction(userId);
        if (res.success) {
            refresh();
        } else {
            alert('Failed to delete user');
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.name || !newUser.email || !newUser.password) return;

        const res = await registerUserAction(newUser.name, newUser.email, newUser.password, newUser.role);

        if (res.success) {
            // Auto approve if added by admin? Or keep as pending. 
            // The action creates as PENDING. 
            // Let's assume admins might want to auto-approve, but safer to let them review.
            setIsAdding(false);
            setNewUser({ role: 'REQUESTOR', name: '', email: '', rank: '', unit: '163 SQN', password: '' });
            refresh();
            alert('User added! They are now in the "Pending" list. Please approve them.');
        } else {
            alert('Error adding user: ' + res.error);
        }
    };

    const pendingRequests = roleRequests.filter(r => r.status === 'PENDING');
    // Ensure we filter correctly based on the 'status' field from DB
    const pendingUsers = users.filter(u => u.status === 'PENDING');
    const activeUsers = users.filter(u => u.status === 'ACTIVE');

    // Logic: MTC can only add MTC. Admin can add others.
    const canAddUsers = currentUser.role === 'ADMIN' || currentUser.role === 'APPROVER_MTC';
    const availableRoles: UserRole[] = currentUser.role === 'APPROVER_MTC'
        ? ['APPROVER_MTC']
        : ['REQUESTOR', 'APPROVER_AS3', 'APPROVER_S3', 'APPROVER_MTC', 'ADMIN'];

    // Password Modal State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<{
        type: 'DELETE' | 'UPDATE_ROLE';
        userId: string;
        payload?: any;
    } | null>(null);

    return (
        <div className="space-y-8">
            <PasswordConfirmModal
                isOpen={showPasswordModal}
                onClose={() => { setShowPasswordModal(false); setPendingAction(null); }}
                actionName={pendingAction?.type === 'DELETE' ? 'Delete User' : 'Update User Role'}
                onConfirm={async (password) => {
                    if (!pendingAction) return;

                    if (pendingAction.type === 'DELETE') {
                        const res = await deleteUserAction(pendingAction.userId, password);
                        if (!res.success) throw new Error(res.error || 'Failed to delete');
                        refresh();
                    } else if (pendingAction.type === 'UPDATE_ROLE') {
                        const res = await updateUserRole(pendingAction.userId, pendingAction.payload, password);
                        if (!res.success) throw new Error(res.error || 'Failed to verify');
                        setEditingUserId(null); // Exit edit mode
                        refresh();
                    }
                    setShowPasswordModal(false);
                    setPendingAction(null);
                }}
            />

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
                            <label className="text-xs font-semibold uppercase text-gray-500">Password</label>
                            <input className="input" type="password" placeholder="Set password" value={newUser.password || ''} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="text-xs font-semibold uppercase text-gray-500">Rank</label>
                            <input className="input" placeholder="e.g. LCP" value={newUser.rank} onChange={e => setNewUser({ ...newUser, rank: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="text-xs font-semibold uppercase text-gray-500">Role</label>
                            <select className="input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
                                {availableRoles.map(r => (
                                    <option key={r} value={r}>
                                        {r === 'ADMIN' ? 'Admin' :
                                            r === 'APPROVER_AS3' ? 'Initial Approver (MT POC)' :
                                                r === 'APPROVER_S3' ? 'Final Approver (S3, DyCO, CO)' :
                                                    r === 'APPROVER_MTC' ? 'Approver (MTC)' :
                                                        'Requestor'}
                                    </option>
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
                                                <option value="APPROVER_AS3">Initial Approver (MT POC)</option>
                                                <option value="APPROVER_S3">Final Approver (S3, DyCO, CO)</option>
                                                <option value="APPROVER_MTC">Approver (MTC)</option>
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
                                                {u.role === 'ADMIN' ? 'ADMIN' :
                                                    u.role === 'APPROVER_AS3' ? 'Initial Approver' :
                                                        u.role === 'APPROVER_S3' ? 'Final Approver' :
                                                            u.role.replace('APPROVER_', '')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {currentUser.role === 'ADMIN' && (
                                            editingUserId === u.id ? (
                                                <div className="flex gap-2 justify-end">
                                                    <button className="text-xs btn-primary px-2 py-1 rounded" onClick={() => {
                                                        // Trigger Modal instead of direct call
                                                        setPendingAction({ type: 'UPDATE_ROLE', userId: u.id, payload: tempRole });
                                                        setShowPasswordModal(true);
                                                    }}>Save</button>
                                                    <button className="text-xs opacity-60" onClick={() => setEditingUserId(null)}>Cancel</button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2 justify-end">
                                                    {u.role !== 'ADMIN' && (
                                                        <button
                                                            className="btn btn-sm btn-outline-primary flex items-center gap-1.5 px-3"
                                                            onClick={async () => {
                                                                try {
                                                                    // 1. Generate Recovery Token for Admin
                                                                    const adminTokenRes = await generateImpersonationToken(currentUser.id);
                                                                    if (typeof window !== 'undefined') {
                                                                        localStorage.setItem('admin_recovery_token', adminTokenRes.token);
                                                                    }

                                                                    // 2. Generate Token for Target User
                                                                    const { token } = await generateImpersonationToken(u.id);

                                                                    // 3. Switch User
                                                                    await signIn('credentials', { impersonationToken: token, callbackUrl: '/dashboard' });
                                                                } catch (e) {
                                                                    alert('Impersonation failed: ' + e);
                                                                }
                                                            }}
                                                            title="View as this user"
                                                        >
                                                            <LogIn size={14} />
                                                            Login As
                                                        </button>
                                                    )}

                                                    <button
                                                        className="btn btn-sm btn-ghost flex items-center gap-1.5 px-3 text-gray-600 hover:bg-gray-100"
                                                        onClick={() => { setEditingUserId(u.id); setTempRole(u.role); }}
                                                    >
                                                        <Edit size={14} />
                                                        Edit
                                                    </button>

                                                    <button
                                                        className="btn btn-sm btn-ghost flex items-center gap-1.5 px-3 text-red-600 hover:bg-red-50"
                                                        onClick={() => {
                                                            if (!confirm('Are you sure you want to delete this user?')) return;
                                                            setPendingAction({ type: 'DELETE', userId: u.id });
                                                            setShowPasswordModal(true);
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                        Delete
                                                    </button>
                                                </div>
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
