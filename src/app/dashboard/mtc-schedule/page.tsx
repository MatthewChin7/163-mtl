'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/store';
import { User, DailyDutyDO } from '@/types';
import { Calendar as CalendarIcon, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, addDays, startOfDay } from 'date-fns';

export default function MtcSchedulePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [duties, setDuties] = useState<DailyDutyDO[]>([]);
    const [draftDuties, setDraftDuties] = useState<DailyDutyDO[]>([]); // Local state for inputs
    const [hasChanges, setHasChanges] = useState(false);

    // View State: We show a week view where MTC can input names
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start Monday
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    useEffect(() => {
        const u = auth.getCurrentUser();
        if (!u || u.role !== 'APPROVER_MTC') {
            router.push('/dashboard');
            return;
        }
        setUser(u);
        const storedDuties = db.dailyDuties.getAll();
        setDuties(storedDuties);
        // Deep copy for draft to avoid reference issues
        setDraftDuties(JSON.parse(JSON.stringify(storedDuties)));
    }, [router]);

    const handleRankNameChange = (dateStr: string, value: string) => {
        setHasChanges(true);
        setDraftDuties(prev => {
            const existingIndex = prev.findIndex(d => d.date === dateStr);
            if (existingIndex !== -1) {
                const newDuties = [...prev];
                newDuties[existingIndex] = { ...newDuties[existingIndex], rankName: value };
                return newDuties;
            } else {
                return [...prev, { date: dateStr, rankName: value }];
            }
        });
    };

    const handleSave = () => {
        draftDuties.forEach(duty => {
            db.dailyDuties.set(duty.date, duty.rankName);
        });
        setDuties(db.dailyDuties.getAll());
        setHasChanges(false);
        alert('Schedule saved successfully.');
    };

    if (!user) return null;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <CalendarIcon className="text-primary" /> In-Camp TO Schedule
                    </h1>
                    <p style={{ color: 'var(--fg-secondary)' }}>Assign Transport Operators for daily In-Camp duties.</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="btn btn-ghost" style={{ padding: '0.5rem' }}><ChevronLeft size={20} /></button>
                    <div style={{ padding: '0 1rem', fontWeight: 600, minWidth: '150px', textAlign: 'center' }}>
                        {format(weekStart, 'd MMM')} - {format(weekDays[6], 'd MMM yyyy')}
                    </div>
                    <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="btn btn-ghost" style={{ padding: '0.5rem' }}><ChevronRight size={20} /></button>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', width: '200px' }}>Date</th>
                            <th style={{ padding: '1rem' }}>Assigned TO (Rank & Name)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {weekDays.map(day => {
                            const dateStr = day.toISOString().split('T')[0];
                            const duty = draftDuties.find(d => d.date === dateStr); // Use draft state
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                            return (
                                <tr key={dateStr} style={{ borderBottom: '1px solid var(--border-subtle)', background: isWeekend ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                                    <td style={{ padding: '1rem', fontWeight: 500, color: isWeekend ? 'var(--fg-secondary)' : 'var(--fg-primary)' }}>
                                        {format(day, 'EEEE, d MMM')}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="Enter Rank & Name..."
                                            value={duty?.rankName || ''}
                                            onChange={(e) => handleRankNameChange(dateStr, e.target.value)}
                                            style={{ width: '100%', maxWidth: '400px' }}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div style={{ padding: '1rem', background: 'var(--bg-panel)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleSave}
                        className="btn btn-primary"
                        disabled={!hasChanges}
                        style={{ opacity: hasChanges ? 1 : 0.5, cursor: hasChanges ? 'pointer' : 'not-allowed' }}
                    >
                        <Save size={18} /> Save Changes
                    </button>
                </div>
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: '#e0f2fe', borderRadius: 'var(--radius-md)', color: '#0369a1', fontSize: '0.875rem' }}>
                ℹ️ <strong>Note:</strong> Remember to click <strong>Save Changes</strong>. These assignments will auto-populate the "Transport Operator" field for In-Camp indents.
            </div>
        </div>
    );
}
