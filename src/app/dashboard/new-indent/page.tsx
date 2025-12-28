'use client';

import IndentManager from '@/components/indents/IndentManager';
import { useRouter } from 'next/navigation';

export default function NewIndentPage() {
    const router = useRouter();

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <button
                    onClick={() => router.back()}
                    style={{ background: 'none', border: 'none', color: 'var(--fg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                >
                    ← Back to Dashboard
                </button>
            </div>
            <IndentManager />
        </div>
    );
}
