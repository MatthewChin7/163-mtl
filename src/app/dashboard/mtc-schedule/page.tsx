'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Indent } from '@/types';
import { Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { getIndents } from '@/app/actions/indents';

export default function MtcSchedulePage() {
    const { data: session } = useSession();
    const [indents, setIndents] = useState<Indent[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        loadIndents();
    }, []);

    const loadIndents = async () => {
        const data = await getIndents();
        setIndents(data as Indent[]);
    };

    // View State: Next 7 days
    // The user asked for "headers for every day". We'll show a week view or infinite scroll?
    // Let's stick to the previous Weekly navigation style but show Indents.
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start Monday
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    if (!session?.user) return null;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <CalendarIcon className="text-primary" /> Daily Schedule
                    </h1>
                    <p style={{ color: 'var(--fg-secondary)' }}>Overview of transport movements by day.</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Simply controls to switch weeks */}
                    <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="btn btn-ghost text-sm">Prev Week</button>
                    <button onClick={() => setCurrentDate(new Date())} className="btn btn-ghost text-sm">Today</button>
                    <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="btn btn-ghost text-sm">Next Week</button>
                </div>
            </div>

            <div className="space-y-6">
                {weekDays.map(day => {
                    const dateStr = format(day, 'EEEE, d MMM yyyy');
                    const dayIndents = indents.filter(i => isSameDay(new Date(i.startTime), day));
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div key={day.toISOString()} className={`glass-panel p-4 ${isToday ? 'border-primary' : ''}`} style={{ borderWidth: isToday ? '2px' : '0' }}>
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                {dateStr}
                                {isToday && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Today</span>}
                                <span className="text-xs font-normal text-gray-500 ml-auto">{dayIndents.length} Indents</span>
                            </h3>

                            {dayIndents.length === 0 ? (
                                <div className="text-gray-400 text-sm italic pl-4">No indents scheduled.</div>
                            ) : (
                                <div className="space-y-2">
                                    {dayIndents.map(indent => (
                                        <div key={indent.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                            <div className="flex gap-4 items-center">
                                                <div className="flex flex-col items-center min-w-[60px] text-sm font-mono text-gray-600">
                                                    <span>{format(new Date(indent.startTime), 'HH:mm')}</span>
                                                    <span className="text-xs opacity-50">to</span>
                                                    <span>{format(new Date(indent.endTime), 'HH:mm')}</span>
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm">{indent.purpose}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                        <MapPin size={12} /> {indent.startLocation} ➔ {indent.endLocation}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right text-xs">
                                                <div className={`font-bold ${indent.status === 'APPROVED' ? 'text-green-600' :
                                                        indent.status === 'REJECTED' ? 'text-red-600' :
                                                            'text-yellow-600'
                                                    }`}>{indent.status}</div>
                                                <div className="text-gray-400">#{indent.serialNumber}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
