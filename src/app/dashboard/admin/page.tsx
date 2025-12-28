'use client';

import { useSession } from 'next-auth/react';
import UserManagement from '@/components/admin/UserManagement';

export default function AdminPage() {
    const { data: session, status } = useSession();

    if (status === 'loading') return <div>Loading...</div>;

    const user = session?.user as any; // Cast as needed for Role

    // Client-side protection (DashboardLayout also handles this, but double check)
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
