'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { auth } from '@/lib/auth';
// import { db } from '@/lib/store';
import { getIndents } from '@/app/actions/indents';
import { useSession } from 'next-auth/react';
import { User, Indent } from '@/types';
import MonthlyIndentList from '@/components/indents/MonthlyIndentList';
import { LayoutList } from 'lucide-react';

export default function MonthlyIndentsPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const user = session?.user as User;

    // const [user, setUser] = useState<User | null>(null); // Derived from session now
    const [indents, setIndents] = useState<Indent[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshData = async () => {
        setLoading(true);
        try {
            const allIndents = await getIndents() as unknown as Indent[];
            // Filter only MONTHLY
            const monthly = allIndents.filter((i: Indent) => i.typeOfIndent === 'MONTHLY'); // Explicit typing
            setIndents(monthly);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session && !loading) {
            // Let Layout handle redirects usually, or do it here
        }
        refreshData();
    }, [session]);

    if (!user || loading) return null;

    if (!['APPROVER_AS3', 'APPROVER_S3', 'APPROVER_MTC'].includes(user.role)) {
        return <div style={{ padding: '2rem' }}>Access Denied. Only Approvers can view this page.</div>;
    }

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <LayoutList className="text-primary" /> Monthly Bulk Indents
                </h1>
                <p style={{ color: 'var(--fg-secondary)', marginTop: '0.5rem' }}>
                    Bulk approve routine monthly transport requests.
                </p>
            </div>

            <MonthlyIndentList indents={indents} user={user} refreshData={refreshData} />
        </div>
    );
}
