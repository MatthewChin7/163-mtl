'use client';

import { useEffect, useState } from 'react';
import { seedInitialConfig } from '@/app/actions/seed';

export default function SeedPage() {
    const [status, setStatus] = useState('Idle');

    useEffect(() => {
        setStatus('Seeding...');
        seedInitialConfig().then(res => {
            if (res.success) setStatus('Success! DB seeded.');
            else setStatus('Failed: ' + res.error);
        });
    }, []);

    return (
        <div style={{ padding: '2rem', fontSize: '2rem' }}>
            {status}
        </div>
    );
}
