'use client';

import { useSession } from 'next-auth/react';

export default function BulkIndentsPage() {
    const { data: session } = useSession();

    return (
        <div style={{ padding: '2rem' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '1rem' }}>Monthly Bulk Indents</h1>
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Bulk indent management feature is coming soon.</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--fg-secondary)', marginTop: '0.5rem' }}>
                    This module will allow uploading Excel files for mass indent creation.
                </p>
            </div>
        </div>
    );
}
