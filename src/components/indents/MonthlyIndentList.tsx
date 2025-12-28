'use client';

import { Indent, User } from '@/types';
// import { db } from '@/lib/store'; // Mock DB removed
import { useState } from 'react';
import { Check, CheckSquare, Square } from 'lucide-react';
import { format } from 'date-fns';
import { updateIndentStatus } from '@/app/actions/indents';

interface MonthlyIndentListProps {
    indents: Indent[];
    user: User;
    refreshData: () => void;
}

export default function MonthlyIndentList({ indents, user, refreshData }: MonthlyIndentListProps) {
    // Filter logic: Standard approval queue logic applies, but only for MONTHLY type (already filtered by page)
    // Actually, user wants a specific "Monthly Bulk Indents" tab.
    // We assume the page passes ALL monthly indents, so we need to filter for what THIS user can approve.

    const approvableIndents = indents.filter(indent => {
        if (user.role === 'APPROVER_AS3') return indent.status === 'PENDING_AS3';
        if (user.role === 'APPROVER_S3') return indent.status === 'PENDING_S3';
        if (user.role === 'APPROVER_MTC') return indent.status === 'PENDING_MTC';
        return false;
    });

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSelectAll = () => {
        if (selectedIds.length === approvableIndents.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(approvableIndents.map(i => i.id));
        }
    };

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(i => i !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleBulkApprove = async () => {
        if (!confirm(`Approve ${selectedIds.length} indents?`)) return;
        setIsSubmitting(true);

        try {
            await Promise.all(selectedIds.map(async (id) => {
                const indent = indents.find(i => i.id === id); // Find in props
                if (!indent) return;

                let nextStatus: any = indent.status;
                // Monthly indents typically follow normal flow
                if (user.role === 'APPROVER_AS3') nextStatus = 'PENDING_S3';
                else if (user.role === 'APPROVER_S3') nextStatus = 'PENDING_MTC';
                else if (user.role === 'APPROVER_MTC') nextStatus = 'APPROVED';

                // Call Server Action
                // Note: updateIndentStatus arguments: (indentId, status, approverId, reason, transportOperatorName)
                await updateIndentStatus(id, nextStatus, user.id, 'Bulk Approval');
            }));

            setSelectedIds([]);
            refreshData();
            alert('Bulk approval complete.');
        } catch (error) {
            console.error("Bulk approval failed", error);
            alert("Some indents failed to update.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (approvableIndents.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--fg-secondary)' }}>
                <h3>No Monthly Indents Pending Your Approval</h3>
                <p>You're all caught up!</p>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Pending Approval ({approvableIndents.length})</h2>
                {selectedIds.length > 0 && (
                    <button className="btn btn-primary" onClick={handleBulkApprove} style={{ background: 'var(--status-success)', border: 'none' }}>
                        <Check size={18} /> Approve Selected ({selectedIds.length})
                    </button>
                )}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                        <th style={{ padding: '0.75rem', width: '40px' }}>
                            <button onClick={handleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-primary)' }}>
                                {selectedIds.length === approvableIndents.length && approvableIndents.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                            </button>
                        </th>
                        <th style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--fg-secondary)' }}>Reference</th>
                        <th style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--fg-secondary)' }}>Dates</th>
                        <th style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--fg-secondary)' }}>Route</th>
                        <th style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--fg-secondary)' }}>Vehicle</th>
                        <th style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--fg-secondary)' }}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {approvableIndents.map(indent => (
                        <tr key={indent.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '0.75rem' }}>
                                <button onClick={() => toggleSelect(indent.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedIds.includes(indent.id) ? 'var(--primary)' : 'var(--fg-secondary)' }}>
                                    {selectedIds.includes(indent.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                </button>
                            </td>
                            <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                                {indent.serialNumber}
                                <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)' }}>{indent.purpose}</div>
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                                {format(new Date(indent.startTime), 'dd MMM HH:mm')} - <br />
                                {format(new Date(indent.endTime), 'dd MMM HH:mm')}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                                {indent.startLocation} → {indent.endLocation}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                                {indent.vehicleType}
                                {indent.vehicleNumber && <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)' }}>{indent.vehicleNumber}</div>}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                                <span style={{
                                    fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px',
                                    background: 'var(--status-warning-bg)', color: 'var(--status-warning)'
                                }}>
                                    {indent.status.replace('_', ' ')}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
