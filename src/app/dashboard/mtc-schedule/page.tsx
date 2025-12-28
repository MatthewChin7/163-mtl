'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWeekend } from 'date-fns';
import { getDutyRoster, updateDutyRoster } from '@/app/actions/schedule';

interface DutyRosterEntry {
    date: string; // ISO
    rankName: string;
}

export default function MtcSchedulePage() {
    const { data: session } = useSession();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [roster, setRoster] = useState<DutyRosterEntry[]>([]);
    const [editingRoster, setEditingRoster] = useState<{ [date: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // MTC Role Check
    const isMTC = session?.user?.role === 'APPROVER_MTC';

    useEffect(() => {
        loadData();
        setEditingRoster({});
        setHasUnsavedChanges(false);
    }, [currentMonth]);

    const loadData = async () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        // Get full grid range
        const start = startOfWeek(monthStart, { weekStartsOn: 1 });
        const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const rosterData = await getDutyRoster(start, end);
        setRoster(rosterData as any);
    };

    const handleRosterChange = (dateIso: string, value: string) => {
        setEditingRoster(prev => ({ ...prev, [dateIso]: value }));
        setHasUnsavedChanges(true);
    };

    const handleSaveAll = async () => {
        if (!hasUnsavedChanges) return;
        setIsSaving(true);
        try {
            const updates = Object.entries(editingRoster).map(([dateIso, value]) => {
                return updateDutyRoster(new Date(dateIso), value);
            });

            await Promise.all(updates);

            await loadData();
            setEditingRoster({});
            setHasUnsavedChanges(false);
            alert('Schedule saved successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to save schedule.');
        } finally {
            setIsSaving(false);
        }
    };

    const getRosterValue = (date: Date) => {
        if (editingRoster[date.toISOString()] !== undefined) {
            return editingRoster[date.toISOString()];
        }
        const entry = roster.find(r => isSameDay(new Date(r.date), date));
        return entry ? entry.rankName : '';
    };

    const calendarDays = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
    });

    const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    if (!session?.user) return null;

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '6rem' }}>
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2 text-red-600">
                        <CalendarIcon />
                        {format(currentMonth, 'MMMM yyyy').toUpperCase()}
                    </h1>
                    <p className="text-gray-500 mt-1">Manage daily duty personnel.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-1 rounded-lg border shadow-sm">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Calendar Grid - Reference Style - Forced Grid with Inline Styles */}
            <div style={{ background: 'white', border: '2px solid #fecaca' }}>
                {/* Headers */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    borderBottom: '2px solid #fecaca'
                }}>
                    {weekDays.map((day, idx) => (
                        <div key={day} style={{
                            padding: '1rem',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: '#ef4444',
                            borderRight: idx < 6 ? '1px solid #fee2e2' : 'none'
                        }}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days - Forced Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    background: 'white'
                }}>
                    {calendarDays.map((day, idx) => {
                        const dateKey = day.toISOString();
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isToday = isSameDay(day, new Date());
                        const value = getRosterValue(day);

                        // Calculate borders based on 7-col grid
                        // Right border for all except last in row (col 7, 14, 21...)
                        // Bottom border for all rows
                        const isLastInRow = (idx + 1) % 7 === 0;
                        const borderRight = isLastInRow ? 'none' : '1px solid #fee2e2';
                        const borderBottom = '1px solid #fee2e2';

                        return (
                            <div
                                key={dateKey}
                                style={{
                                    minHeight: '150px',
                                    borderRight,
                                    borderBottom,
                                    padding: '0.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    background: isCurrentMonth ? 'white' : '#f9fafb',
                                    position: 'relative'
                                }}
                            >
                                {/* Date Number */}
                                <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold',
                                    marginBottom: '0.5rem',
                                    color: isToday ? '#2563eb' : (isCurrentMonth ? '#ef4444' : '#fca5a5')
                                }}>
                                    {format(day, 'd')}
                                </div>

                                {/* Content Input Area */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    {isMTC ? (
                                        <textarea
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                resize: 'none',
                                                background: 'transparent',
                                                border: 'none',
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                color: '#1f2937',
                                                fontFamily: 'inherit',
                                                outline: 'none',
                                                padding: '2px'
                                            }}
                                            placeholder="Duty Person"
                                            value={value}
                                            onChange={(e) => handleRosterChange(dateKey, e.target.value)}
                                        />
                                    ) : (
                                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1f2937', whiteSpace: 'pre-wrap' }}>
                                            {value}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Floating Save Button */}
            {isMTC && (
                <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 transition-all duration-300 ${hasUnsavedChanges ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
                    <button
                        onClick={handleSaveAll}
                        disabled={isSaving}
                        className="btn shadow-xl pl-6 pr-8 py-3 rounded-full flex items-center gap-3 text-white font-bold text-lg hover:scale-105 transition-transform"
                        style={{ background: '#dc2626' }}
                    >
                        {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                        Save Schedule Changes
                    </button>
                </div>
            )}
        </div>
    );
}
