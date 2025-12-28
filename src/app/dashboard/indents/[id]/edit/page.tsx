'use client';

import IndentManager from '@/components/indents/IndentManager';
import { getIndent } from '@/app/actions/indents'; // Import Indent Action
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
        const loadIndent = async () => {
            if (id) {
                const found = await getIndent(id);
                if (found) {
                    setIndent(found as unknown as Indent);
                } else {
                    router.push('/dashboard/indents');
                }
            }
        };
        loadIndent();
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
            <IndentManager initialIndent={indent} />
        </div>
    );
}
