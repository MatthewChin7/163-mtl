'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { UserRole } from '@/types';
import { Save, ShieldAlert, Key, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updateUserProfile, requestRoleChange } from '@/app/actions/users';
import { updateUserImage } from '@/app/actions/profile';
import { useToast } from '@/components/ui/Toast';

export default function ProfilePage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { showToast } = useToast();

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        rank: '',
        email: '',
        unit: '',
        password: '' // New password field
    });

    // Role Request State
    const [requestedRole, setRequestedRole] = useState<UserRole>('REQUESTOR');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (session?.user) {
            setFormData(prev => ({
                ...prev,
                name: session.user?.name || '',
                rank: (session.user as any).rank || '',
                email: session.user?.email || '',
                unit: (session.user as any).unit || '',
            }));
            // Initialize desired role different from current?
        }
    }, [session]);

    if (status === 'loading') return <div>Loading...</div>;
    if (!session?.user) return <div>Access Denied</div>;

    const user = session.user as any;

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        const updateData: any = {
            name: formData.name,
            rank: formData.rank,
        };
        if (formData.password) {
            updateData.password = formData.password;
        }

        const res = await updateUserProfile(user.id, updateData);

        if (res.success) {
            showToast("Profile updated successfully", "success");
            setFormData(prev => ({ ...prev, password: '' })); // Clear password field
            // No reload needed usually if we just update session or if we don't care about immediate reflect in header
            // But to reflect changes in header immediately, reload is easy way
            setTimeout(() => window.location.reload(), 1000);
        } else {
            showToast("Update failed: " + res.error, "error");
        }
    };

    const handleRequestRole = async () => {
        const res = await requestRoleChange(user.id, requestedRole);
        if (res.success) {
            showToast("Role change request sent to Admin.", "success");
        } else {
            showToast("Request failed: " + res.error, "error");
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1024 * 1024) { // 1MB limit
                showToast('Image too large (max 1MB)', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                setUploading(true);
                const res = await updateUserImage(base64);
                setUploading(false);
                if (res.success) {
                    showToast('Profile image updated', 'success');
                    // Force reload to update session user image if NextAuth doesn't auto sync
                    setTimeout(() => window.location.reload(), 500);
                } else {
                    showToast('Failed to update image', 'error');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '2rem' }}>My Profile</h1>

            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: 'white',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                        {user.name?.charAt(0)}
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{user.name}</h2>
                        <div style={{ color: 'var(--fg-secondary)' }}>{user.email}</div>
                        <div style={{ marginTop: '0.5rem' }}>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {user.role}
                            </span>
                        </div>
                    </div>
                </div>

                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Edit Details</h2>
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
                        <input className="input" value={formData.email} disabled title="Cannot change email" style={{ opacity: 0.7 }} />
                    </div>
                    <div className="form-group">
                        <label className="text-xs font-semibold uppercase text-gray-500">Unit</label>
                        <input className="input" value={formData.unit} disabled title="Unit is fixed" style={{ opacity: 0.7 }} />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-1">
                            <Key size={14} /> Change Password (Optional)
                        </label>
                        <input
                            className="input"
                            type="password"
                            placeholder="Enter new password to change"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
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

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <select
                            className="input"
                            style={{ width: 'auto' }}
                            value={requestedRole}
                            onChange={(e) => setRequestedRole(e.target.value as UserRole)}
                        >
                            <option value="REQUESTOR">Requestor</option>
                            <option value="APPROVER_AS3">Initial Approver (MT POC)</option>
                            <option value="APPROVER_S3">Final Approver (S3, DyCO, CO)</option>
                            <option value="APPROVER_MTC">Approver (MTC)</option>
                        </select>
                        <button className="btn btn-primary" onClick={handleRequestRole}>Request Change</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
