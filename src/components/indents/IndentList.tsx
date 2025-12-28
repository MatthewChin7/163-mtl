'use client';

import { Indent, User } from '@/types';
import { db } from '@/lib/store';
import { useState } from 'react';
import { Check, X, Eye, Edit, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface IndentListProps {
    indents: Indent[];
    user: User;
    refreshData: () => void;
}

export default function IndentList({ indents, user, refreshData }: IndentListProps) {
    const router = useRouter();
    const [selectedIndent, setSelectedIndent] = useState<Indent | null>(null);

    // MTC Visibility Filter:
    // 1. MTC only sees indents that are PENDING_MTC, APPROVED, or REJECTED.
    // 2. MTC should NOT see SELF_DRIVE or INCAMP_TO indents (as they skip MTC approval).
    const visibleIndents = indents.filter(indent => {
        if (user.role === 'APPROVER_MTC') {
            const isInternal = indent.typeOfIndent === 'SELF_DRIVE' || indent.typeOfIndent === 'INCAMP_TO';
            if (isInternal) return false;
            return ['PENDING_MTC', 'APPROVED', 'REJECTED'].includes(indent.status);
        }
        return true;
    });

    const handleUpdateTO = (indentId: string, currentTO: string) => {
        const newTO = prompt("Update Transport Operator (Driver Name):", currentTO || '');
        if (newTO !== null && newTO !== currentTO) {
            db.indents.update(indentId, { transportOperator: newTO });
            refreshData();
        }
    };
    const handleApprove = (indentId: string) => {
        const indent = db.indents.getById(indentId);
        if (!indent) return;

        // MTC Specific Rule: Must input TO Name to approve
        if (user.role === 'APPROVER_MTC' && !indent.transportOperator) {
            const toName = prompt("Transport Operator Name is required for approval. Please enter full rank and name:");
            if (!toName) return; // User cancelled or empty

            // Update TO name immediately
            db.indents.update(indentId, { transportOperator: toName });
        }
        // What if user role is MTC and TO exists? Proceed.

        let nextStatus = indent.status;
        if (user.role === 'APPROVER_AS3') nextStatus = 'PENDING_S3';
        else if (user.role === 'APPROVER_S3') {
            const isInternal = indent.typeOfIndent === 'SELF_DRIVE' || indent.typeOfIndent === 'INCAMP_TO';
            // Skip MTC for internal indents
            nextStatus = isInternal ? 'APPROVED' : 'PENDING_MTC';
        }
        else if (user.role === 'APPROVER_MTC') nextStatus = 'APPROVED';

        db.indents.update(indentId, {
            status: nextStatus,
            approvalLogs: [
                ...indent.approvalLogs,
                {
                    stage: user.role,
                    status: 'APPROVED',
                    timestamp: new Date().toISOString(),
                    approverId: user.id,
                    approverName: user.name
                }
            ]
        });
        refreshData();
    };

    const handleReject = (indentId: string) => {
        const reason = prompt("Reason for rejection:");
        if (!reason) return;

        const indent = db.indents.getById(indentId);
        if (!indent) return;

        db.indents.update(indentId, {
            status: 'REJECTED',
            approvalLogs: [
                ...indent.approvalLogs,
                {
                    stage: user.role,
                    status: 'REJECTED',
                    timestamp: new Date().toISOString(),
                    approverId: user.id,
                    approverName: user.name,
                    reason
                }
            ]
        });
        refreshData();
    };

    const handleCancel = (indentId: string) => {
        const reason = prompt("Reason for cancellation:");
        if (!reason) return;

        db.indents.update(indentId, {
            status: 'CANCELLED',
            cancellationReason: reason
        });
        refreshData();
    };

    if (indents.length === 0) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--fg-secondary)' }}>No indents found.</div>;
    }

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            {visibleIndents.map(indent => {
                const canApprove = (
                    (user.role === 'APPROVER_AS3' && indent.status === 'PENDING_AS3') ||
                    (user.role === 'APPROVER_S3' && indent.status === 'PENDING_S3') ||
                    (user.role === 'APPROVER_MTC' && indent.status === 'PENDING_MTC') ||
                    (user.role === 'REQUESTOR' && indent.status === 'PENDING_REQUESTOR' && indent.requestorId === user.id)
                );

                const canCancel = (
                    user.role === 'REQUESTOR' &&
                    indent.requestorId === user.id &&
                    !['CANCELLED', 'REJECTED', 'APPROVED'].includes(indent.status)
                );

                const canEdit = !['CANCELLED', 'REJECTED'].includes(indent.status);

                return (
                    <div key={indent.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, background: 'var(--bg-surface)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                    {indent.serialNumber}
                                </span>
                                <span style={{
                                    fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '999px',
                                    background: indent.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.2)' :
                                        indent.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.2)' :
                                            indent.status === 'PENDING_REQUESTOR' ? 'rgba(239, 68, 68, 0.1)' :
                                                'rgba(245, 158, 11, 0.2)',
                                    color: indent.status === 'APPROVED' ? 'var(--status-success)' :
                                        indent.status === 'REJECTED' ? 'var(--status-danger)' :
                                            indent.status === 'PENDING_REQUESTOR' ? 'var(--status-danger)' :
                                                'var(--status-warning)'
                                }}>
                                    {indent.status.replace('_', ' ')}
                                </span>
                            </div>

                            <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                                {indent.purpose} ({indent.vehicleType})
                            </div>

                            <div style={{ color: 'var(--fg-secondary)', fontSize: '0.875rem', display: 'flex', gap: '1rem' }}>
                                <span>📅 {format(new Date(indent.startTime), 'dd MMM HH:mm')} - {format(new Date(indent.endTime), 'HH:mm')}</span>
                                <span>📍 {indent.startLocation} → {indent.endLocation}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {canApprove && (
                                <>
                                    <button
                                        onClick={() => handleApprove(indent.id)}
                                        className="btn"
                                        style={{ background: 'var(--status-success)', color: 'white', padding: '0.5rem' }}
                                        title={user.role === 'REQUESTOR' ? "Confirm" : "Approve"}
                                    >
                                        {user.role === 'REQUESTOR' ? <RotateCcw size={18} /> : <Check size={18} />}
                                    </button>
                                    {user.role !== 'REQUESTOR' && (
                                        <button
                                            onClick={() => handleReject(indent.id)}
                                            className="btn"
                                            style={{ background: 'var(--status-danger)', color: 'white', padding: '0.5rem' }}
                                            title="Reject"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </>
                            )}

                            {canEdit && (
                                <button
                                    onClick={() => router.push(`/dashboard/indents/${indent.id}/edit`)}
                                    className="btn"
                                    style={{ background: 'var(--bg-surface)', color: 'var(--fg-primary)', padding: '0.5rem', border: '1px solid var(--border-subtle)' }}
                                    title="Edit Indent"
                                >
                                    <Edit size={18} />
                                </button>
                            )}

                            {canCancel && (
                                <button
                                    onClick={() => handleCancel(indent.id)}
                                    className="btn"
                                    style={{ background: 'var(--bg-surface)', color: 'var(--fg-secondary)', padding: '0.5rem', border: '1px solid var(--border-subtle)' }}
                                    title="Cancel Request"
                                >
                                    <span style={{ fontSize: '0.75rem' }}>Cancel</span>
                                </button>
                            )}

                            {/* Detail view would go here */}
                        </div>
                    </div>
                );
            })}

            {/* Indent Details Modal */}
            {selectedIndent && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setSelectedIndent(null)}>
                    <div className="glass-panel" style={{ background: 'var(--bg-panel)', padding: '2rem', width: '600px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Indent Details</h2>
                            <button className="btn btn-ghost" onClick={() => setSelectedIndent(null)}><X size={24} /></button>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div className="detail-item">
                                <label style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Purpose</label>
                                <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{selectedIndent.purpose}</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="detail-item">
                                    <label style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Time</label>
                                    <div>{format(new Date(selectedIndent.startTime), 'dd MMM yyyy, HH:mm')}</div>
                                </div>
                                <div className="detail-item">
                                    <label style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>End Time</label>
                                    <div>{format(new Date(selectedIndent.endTime), 'dd MMM yyyy, HH:mm')}</div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="detail-item">
                                    <label style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Location</label>
                                    <div>{selectedIndent.startLocation}</div>
                                </div>
                                <div className="detail-item">
                                    <label style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>End Location</label>
                                    <div>{selectedIndent.endLocation}</div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="detail-item">
                                    <label style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle Type</label>
                                    <div>{selectedIndent.vehicleType}</div>
                                </div>
                                <div className="detail-item">
                                    <label style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle Number</label>
                                    <div>{selectedIndent.vehicleNumber || '-'}</div>
                                </div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transport Operator</label>
                                <div>{selectedIndent.transportOperator || 'Pending Assignment'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle Commander</label>
                                <div>{selectedIndent.vehicleCommanderName}</div>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Approval Log</h3>
                            {selectedIndent.approvalLogs.map((log, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                    <span>
                                        {log.stage === 'APPROVER_AS3' ? 'Initial Approver' :
                                            log.stage === 'APPROVER_S3' ? 'Final Approver' :
                                                log.stage.replace('APPROVER_', '')} ({log.approverName})
                                    </span>
                                    <span style={{ color: log.status === 'APPROVED' ? 'var(--status-success)' : 'var(--status-danger)' }}>{log.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
