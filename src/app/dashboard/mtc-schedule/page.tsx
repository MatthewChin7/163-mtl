'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Indent } from '@/types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Save, User as UserIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { getIndents } from '@/app/actions/indents';
import { getDutyRoster, updateDutyRoster } from '@/app/actions/schedule';

interface DutyRosterEntry {
    date: string; // ISO
    rankName: string;
}

export default function MtcSchedulePage() {
    const { data: session } = useSession();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [indents, setIndents] = useState<Indent[]>([]);
    const [roster, setRoster] = useState<DutyRosterEntry[]>([]);
    const [editingRoster, setEditingRoster] = useState<{ [date: string]: string }>({});

    // MTC Role Check
    const isMTC = session?.user?.role === 'APPROVER_MTC';

    useEffect(() => {
        loadData();
    }, [currentMonth]);

    const loadData = async () => {
        // Calculate range for fetching
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        // Fetch Indents (we filter locally for now, optimization: server filter)
        // Ideally getIndents should accept date range, but we'll fetch all active for demo or stick to simple
        // For efficiency in production we'd add range params to getIndents. 
        // Calling existing getIndents() which returns list.
        const allIndents = await getIndents();
        setIndents(allIndents as unknown as Indent[]);

        // Fetch Roster
        // We need the full grid range including previous/next month overflow
        const start = startOfWeek(monthStart, { weekStartsOn: 1 });
        const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const rosterData = await getDutyRoster(start, end);
        setRoster(rosterData as any);
    };

    const handleRosterChange = (dateIso: string, value: string) => {
        setEditingRoster(prev => ({ ...prev, [dateIso]: value }));
    };

    const saveRosterEntry = async (date: Date, value: string) => {
        // Optimistic update logic could go here
        const res = await updateDutyRoster(date, value);
        if (res.success) {
            // Reload to confirm or update local state
            loadData();
            // Clear editing state for that key to show saved view
            const key = date.toISOString();
            // Optional: keep it editable or show toast
        } else {
            alert('Failed to save');
        }
    };

    const getRosterValue = (date: Date) => {
        // Return active edit or saved value
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

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    if (!session?.user) return null;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '2rem' }}>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <CalendarIcon className="text-primary" />
                        In-Camp TO Schedule
                    </h1>
                    <p className="text-gray-500">Manage daily duty personnel and view transport volume.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-1 rounded-lg border shadow-sm">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-bold text-lg w-40 text-center select-none">
                        {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Weekday Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', color: '#6b7280' }}>
                    {weekDays.map(day => (
                        <div key={day} style={{ padding: '0.5rem 0.5rem', textAlign: 'right', fontWeight: 500, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days - Force Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {calendarDays.map((day, idx) => {
                        const dateKey = day.toISOString();
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isToday = isSameDay(day, new Date());
                        const dayIndents = indents.filter(i => isSameDay(new Date(i.startTime), day));
                        const rosterValue = getRosterValue(day);

                        return (
                            <div
                                key={dateKey}
                                className={`
                                    min-h-[140px] border-b border-r bg-white p-1 flex flex-col gap-1 transition-colors relative
                                    ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-300' : ''}
                                    ${idx % 7 === 6 ? 'border-r-0' : ''}
                                `}
                            >
                                {/* Date Header */}
                                <div className="flex justify-end p-1">
                                    <span className={`
                                        text-xs font-semibold h-6 w-6 flex items-center justify-center rounded-full
                                        ${isToday ? 'bg-red-500 text-white' : (isCurrentMonth ? 'text-gray-700' : 'text-gray-400')}
                                    `}>
                                        {format(day, 'd')}
                                        {format(day, 'd') === '1' && <span className="ml-1 hidden md:inline">{format(day, 'MMM')}</span>}
                                    </span>
                                </div>

                                {/* Duty Personnel (Red 'Header' Event) */}
                                {isMTC ? (
                                    <div className="mb-1 flex gap-1 items-center">
                                        <input
                                            type="text"
                                            className="flex-1 min-w-0 text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold border-l-2 border-red-500 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 placeholder:text-red-300 truncate"
                                            placeholder="Duty Person..."
                                            value={rosterValue}
                                            onChange={(e) => handleRosterChange(dateKey, e.target.value)}
                                            onBlur={(e) => saveRosterEntry(day, e.target.value)}
                                        />
                                        <button
                                            onClick={() => saveRosterEntry(day, rosterValue)}
                                            className="p-0.5 text-red-600 hover:bg-red-50 rounded"
                                            title="Save Duty Personnel"
                                        >
                                            <Save size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    rosterValue && (
                                        <div className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold border-l-2 border-red-500 truncate mb-1" title="Duty Personnel">
                                            {rosterValue}
                                        </div>
                                    )
                                )}

                                {/* Indents Hidden as requested by user ("not show any of the indents") */}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-4 text-xs text-gray-500 flex justify-end gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-600 rounded-sm"></div>
                    <span>Header (Calendar)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span>Today</span>
                </div>
            </div>
        </div>
    );
}
