'use client';

import { auth } from '@/lib/auth';
import { db } from '@/lib/store';
import { useEffect, useState } from 'react';
import { Indent } from '@/types';
import { exportIndentsToExcel } from '@/lib/excel';
import { Download } from 'lucide-react';
import IndentList from '@/components/indents/IndentList';

export default function AllIndentsPage() {
    const [indents, setIndents] = useState<Indent[]>([]);
    const user = auth.getCurrentUser();

    useEffect(() => {
        setIndents(db.indents.getAll());
    }, []);

    if (!user) return null;

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
                refreshData={() => setIndents(db.indents.getAll())}
            />
        </div>
    );
}
