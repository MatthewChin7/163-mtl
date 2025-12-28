'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { db } from '@/lib/store'; // Removed mock store
import { getIndents } from '@/app/actions/indents'; // Import Server Action
import { Indent } from '@/types';
// import { auth } from '@/lib/auth'; // Migrating to useSession
import { useSession } from 'next-auth/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { format, startOfWeek, addDays, startOfDay, endOfDay, isWithinInterval, parseISO, endOfWeek } from 'date-fns';
import { exportIndentsToExcel } from '@/lib/excel';

export default function SchedulePage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 }),
    });
    const [indents, setIndents] = useState<Indent[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [locationFilter, setLocationFilter] = useState('');
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState('ALL');
    const [showOnlyMyIndents, setShowOnlyMyIndents] = useState(false);

    // Derived user from session
    const user = session?.user;

    // Modal State
    const [selectedIndent, setSelectedIndent] = useState<Indent | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const allIndents = await getIndents() as unknown as Indent[];

                // Filter by date range (overlap logic)
                const visibleParams = allIndents.filter((i: Indent) => {
                    const iStart = new Date(i.startTime);
                    const iEnd = new Date(i.endTime);
                    return iStart <= dateRange.end && iEnd >= dateRange.start;
                });

                let filtered = visibleParams;
                if (locationFilter) {
                    const search = locationFilter.toLowerCase();
                    filtered = filtered.filter((i: Indent) =>
                        i.startLocation.toLowerCase().includes(search) ||
                        i.endLocation.toLowerCase().includes(search) ||
                        (i.waypoints || []).some((w: any) => w.location.toLowerCase().includes(search))
                    );
                }
                if (vehicleTypeFilter !== 'ALL') {
                    filtered = filtered.filter((i: Indent) => i.vehicleType === vehicleTypeFilter);
                }
                if (showOnlyMyIndents && user) {
                    filtered = filtered.filter((i: Indent) => i.requestorId === user.id);
                }

                // Sort by start time
                filtered.sort((a: Indent, b: Indent) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                setIndents(filtered);
            } catch (error) {
                console.error("Failed to load schedule:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange, locationFilter, vehicleTypeFilter, showOnlyMyIndents, user]);

    const handlePreviousWeek = () => {
        setDateRange(prev => ({
            start: addDays(prev.start, -7),
            end: addDays(prev.end, -7),
        }));
    };

    const handleNextWeek = () => {
        setDateRange(prev => ({
            start: addDays(prev.start, 7),
            end: addDays(prev.end, 7),
        }));
    };

    // Helper to format route with waypoints
    const formatRoute = (indent: Indent) => {
        const waypoints = (indent.waypoints || []).map(w => w.location);
        const route = [indent.startLocation, ...waypoints, indent.endLocation];
        return route.join(' → ');
    };


    // Helper to generate days
    const getDaysArray = (start: Date, end: Date) => {
        const arr = [];
        let dt = new Date(start);
        while (dt <= end) {
            arr.push(new Date(dt));
            dt = addDays(dt, 1);
        }
        return arr;
    };

    const days = getDaysArray(dateRange.start, dateRange.end);

    // Helper to check overlap
    const isOverlapping = (indent: Indent, day: Date) => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const iStart = new Date(indent.startTime);
        const iEnd = new Date(indent.endTime);
        return iStart <= dayEnd && iEnd >= dayStart;
    };

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
            {/* Header Controls (Keep existing) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <CalendarIcon className="text-primary" /> Daily MT Schedule
                    </h1>
                    <p style={{ color: 'var(--fg-secondary)' }}>Overview of all transport movements.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="glass-panel" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Search size={16} style={{ color: 'var(--fg-secondary)' }} />
                        <input
                            placeholder="Filter location..."
                            className="input"
                            style={{ border: 'none', padding: '0.25rem', width: '150px' }}
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                        <button onClick={handlePreviousWeek} className="btn btn-ghost" style={{ padding: '0.5rem' }}><ChevronLeft size={20} /></button>
                        <div style={{ padding: '0 1rem', fontWeight: 600, minWidth: '150px', textAlign: 'center' }}>
                            {format(dateRange.start, 'd MMM')} - {format(dateRange.end, 'd MMM')}
                        </div>
                        <button onClick={handleNextWeek} className="btn btn-ghost" style={{ padding: '0.5rem' }}><ChevronRight size={20} /></button>
                    </div>
                </div>
            </div>

            {/* Daily Groups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {days.map((day) => {
                    // Find indents for this day
                    const dayIndents = indents.filter(i => isOverlapping(i, day));

                    return (
                        <div key={day.toISOString()}>
                            {/* Date Header */}
                            <h3 style={{
                                fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem',
                                color: 'var(--fg-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}>
                                {format(day, 'd MMM (EEEE)')}
                                <span style={{ fontSize: '0.9rem', color: 'var(--fg-tertiary)', fontWeight: 500 }}>
                                    {dayIndents.length} movements
                                </span>
                            </h3>

                            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--fg-secondary)' }}>
                                            <th style={{ padding: '0.75rem 1rem', width: '220px' }}>Execution Time</th>
                                            <th style={{ padding: '0.75rem 1rem', width: '100px' }}>Type</th>
                                            <th style={{ padding: '0.75rem 1rem' }}>Route</th>
                                            <th style={{ padding: '0.75rem 1rem', width: '150px' }}>Purpose</th>
                                            <th style={{ padding: '0.75rem 1rem', width: '120px' }}>Vehicle</th>
                                            <th style={{ padding: '0.75rem 1rem', width: '150px' }}>Driver (TO)</th>
                                            <th style={{ padding: '0.75rem 1rem', width: '100px' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dayIndents.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--fg-tertiary)', fontStyle: 'italic' }}>
                                                    No movements scheduled.
                                                </td>
                                            </tr>
                                        ) : (
                                            dayIndents.map((indent) => (
                                                <tr
                                                    key={`${indent.id}-${day.toISOString()}`}
                                                    style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.2s' }}
                                                    className="hover:bg-black/5"
                                                    onClick={() => setSelectedIndent(indent)}
                                                >
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500, whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                                                        {format(new Date(indent.startTime), 'dd MMM HH:mm')} - <br />
                                                        {format(new Date(indent.endTime), 'dd MMM HH:mm')}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                        <span style={{
                                                            padding: '0.2rem 0.5rem',
                                                            borderRadius: '999px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                            background: indent.typeOfIndent === 'INCAMP_TO' ? '#dbeafe' : '#f3f4f6',
                                                            color: indent.typeOfIndent === 'INCAMP_TO' ? '#1e40af' : '#374151'
                                                        }}>
                                                            {indent.typeOfIndent.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>
                                                        {formatRoute(indent)}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', color: 'var(--fg-secondary)' }}>{indent.purpose}</td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>{indent.vehicleType}</td>
                                                    <td style={{ padding: '0.75rem 1rem', color: indent.transportOperator ? 'var(--fg-primary)' : 'var(--fg-tertiary)' }}>
                                                        {indent.transportOperator || 'TBC'}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: indent.status === 'APPROVED' ? '#10b981' : indent.status === 'REJECTED' ? '#ef4444' : '#f59e0b' }} />
                                                            {indent.status}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>


            {/* Detail Modal */}
            {selectedIndent && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 100
                }} onClick={() => setSelectedIndent(null)}>
                    <div
                        className="glass-panel"
                        style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--bg-surface)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Indent Details</h2>
                                <p style={{ color: 'var(--fg-secondary)' }}>Serial #{selectedIndent.serialNumber}</p>
                            </div>
                            <button onClick={() => setSelectedIndent(null)} className="btn btn-ghost" style={{ padding: '0.5rem' }}>Close</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-secondary)', textTransform: 'uppercase' }}>Timing</label>
                                <div style={{ fontWeight: 500 }}>
                                    {format(new Date(selectedIndent.startTime), 'dd MMM yyyy, HHmm')} <br />
                                    To {format(new Date(selectedIndent.endTime), 'dd MMM yyyy, HHmm')}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-secondary)', textTransform: 'uppercase' }}>Vehicle</label>
                                <div style={{ fontWeight: 500 }}>{selectedIndent.vehicleType} {selectedIndent.vehicleTypeOther ? `(${selectedIndent.vehicleTypeOther})` : ''}</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--fg-secondary)' }}>{selectedIndent.vehicleNumber || 'No Vehicle ID'}</div>
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-secondary)', textTransform: 'uppercase' }}>Full Route</label>
                                <div style={{ fontWeight: 500, fontSize: '1.1rem', marginTop: '0.25rem' }}>
                                    {formatRoute(selectedIndent)}
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-secondary)', textTransform: 'uppercase' }}>Vehicle Commander</label>
                                <div>{selectedIndent.vehicleCommanderName}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-secondary)', textTransform: 'uppercase' }}>Transport Operator</label>
                                <div>{selectedIndent.transportOperator || 'Pending Assignment'}</div>
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-secondary)', textTransform: 'uppercase' }}>Purpose & Reason</label>
                                <div style={{ fontWeight: 500 }}>{selectedIndent.purpose}</div>
                                <div style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem' }}>{selectedIndent.reason}</div>
                            </div>

                            {(selectedIndent.rplTiming || selectedIndent.rplTimingDepart || selectedIndent.rplTimingArrive) && (
                                <div style={{ gridColumn: 'span 2', background: '#f0f9ff', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0369a1', textTransform: 'uppercase' }}>RPL Timings</label>
                                    <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                                        {selectedIndent.rplTimingDepart && (
                                            <div>
                                                <span style={{ color: '#0c4a6e', fontSize: '0.8rem' }}>Departing ME:</span>
                                                <strong style={{ marginLeft: '0.5rem' }}>{selectedIndent.rplTimingDepart}</strong>
                                            </div>
                                        )}
                                        {selectedIndent.rplTimingArrive && (
                                            <div>
                                                <span style={{ color: '#0c4a6e', fontSize: '0.8rem' }}>Arriving ME:</span>
                                                <strong style={{ marginLeft: '0.5rem' }}>{selectedIndent.rplTimingArrive}</strong>
                                            </div>
                                        )}
                                        {selectedIndent.rplTiming && (
                                            <div>
                                                <span style={{ color: '#0c4a6e', fontSize: '0.8rem' }}>RPL:</span>
                                                <strong style={{ marginLeft: '0.5rem' }}>{selectedIndent.rplTiming}</strong>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-secondary)', textTransform: 'uppercase' }}>Special Instructions</label>
                                <div>{selectedIndent.specialInstructions || 'None'}</div>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-secondary)', textTransform: 'uppercase' }}>Status History</label>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                                {selectedIndent.approvalLogs.length === 0 ? (
                                    <span style={{ color: 'var(--fg-tertiary)' }}>No history available (Pending first approval).</span>
                                ) : (
                                    selectedIndent.approvalLogs.map((log, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                                            <span>{log.status === 'APPROVED' ? '✅ Approved' : '❌ Rejected'} by <strong>{log.approverName}</strong> ({log.stage})</span>
                                            <span style={{ color: 'var(--fg-tertiary)' }}>{format(new Date(log.timestamp), 'd MMM HH:mm')}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
