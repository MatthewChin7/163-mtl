'use client';

import { auth } from '@/lib/auth';
import { db } from '@/lib/store';
import UserManagement from '@/components/admin/UserManagement';

export default function AdminPage() {
    const user = auth.getCurrentUser();
    const allUsers = db.users.getAll();

    if (!user || user.role !== 'ADMIN') {
        return <div style={{ padding: '2rem' }}>Access Denied</div>;
    }

    return (
        <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '2rem' }}>Administration</h1>
            <UserManagement currentUser={user} />
        </div>
    );
}
