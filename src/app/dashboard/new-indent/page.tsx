'use client';

import IndentForm from '@/components/indents/IndentForm';

export default function NewIndentPage() {
    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <button
                    onClick={() => history.back()}
                    style={{ background: 'none', border: 'none', color: 'var(--fg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                >
                    ← Back to Dashboard
                </button>
            </div>
            <IndentForm />
        </div>
    );
}
