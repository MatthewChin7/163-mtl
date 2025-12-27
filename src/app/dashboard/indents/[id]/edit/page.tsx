'use client';

import IndentForm from '@/components/indents/IndentForm';
import { db } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Indent } from '@/types';
import { use } from 'react';

export default function EditIndentPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [indent, setIndent] = useState<Indent | null>(null);

    // Unwrap params using React.use()
    const { id } = use(params);

    useEffect(() => {
        if (id) {
            const found = db.indents.getById(id);
            if (found) {
                setIndent(found);
            } else {
                router.push('/dashboard/indents');
            }
        }
    }, [id, router]);

    if (!indent) return <div className="p-8">Loading...</div>;

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <button
                    onClick={() => router.back()}
                    style={{ background: 'none', border: 'none', color: 'var(--fg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                >
                    ← Back
                </button>
            </div>
            <IndentForm initialData={indent} isEditing={true} />
        </div>
    );
}
