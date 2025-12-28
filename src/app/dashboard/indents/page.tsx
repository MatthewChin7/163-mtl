'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Indent } from '@/types';
import { exportIndentsToExcel } from '@/lib/excel';
import { Download } from 'lucide-react';
import IndentList from '@/components/indents/IndentList';
import { getIndents } from '@/app/actions/indents';

export default function AllIndentsPage() {
    const { data: session } = useSession();
    const [indents, setIndents] = useState<Indent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadIndents();
    }, [session]);

    const loadIndents = async () => {
        if (!session?.user) return;
        setLoading(true);
        const allIndents = await getIndents();

        // Filter logic identical to Dashboard
        const user = session.user as any;
        const filtered = user.role === 'REQUESTOR'
            ? allIndents.filter((i: any) => i.requestorId === user.id)
            : allIndents;

        setIndents(filtered as Indent[]);
        setLoading(false);
    };

    if (!session?.user) return null;
    if (loading) return <div className="p-8">Loading indents...</div>;

    const user = session.user as any;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>All Indents</h1>
                <button
                    onClick={() => exportIndentsToExcel(indents)}
                    className="btn btn-primary"
                >
                    <Download size={18} /> Export Excel
                </button>
            </div>
            <IndentList
                indents={indents}
                user={user}
                refreshData={loadIndents}
            />
        </div>
    );
}
