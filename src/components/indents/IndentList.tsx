'use client';

import { Indent, User } from '@/types';
// import { db } from '@/lib/store'; // Removed mock store usage
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

import { updateIndentStatus, updateTransportOperator } from '@/app/actions/indents';
import IndentDetailsModal from './IndentDetailsModal';

export default function IndentList({ indents, user, refreshData }: IndentListProps) {
    const router = useRouter();
    const [selectedIndent, setSelectedIndent] = useState<Indent | null>(null);
    const [actionState, setActionState] = useState<{ [key: string]: { reason: string, loading: boolean, toName?: string, isQualified?: boolean } }>({});

    const updateActionState = (id: string, field: string, value: any) => {
        setActionState(prev => ({
            ...prev,
            [id]: { ...(prev[id] || { reason: '', loading: false }), [field]: value }
        }));
    };

    // MTC Visibility Filter:
    // 1. MTC only sees indents that are PENDING_MTC, APPROVED, or REJECTED.
    // 2. MTC should NOT see SELF_DRIVE or INCAMP_TO indents (as they skip MTC approval).
    // 3. MTC should NOT see indents rejected by earlier approvers (AS3/S3). Only see REJECTED if MTC rejected it.
    const visibleIndents = indents.filter(indent => {
        if (user.role === 'APPROVER_MTC') {
            const isInternal = indent.typeOfIndent === 'SELF_DRIVE' || indent.typeOfIndent === 'INCAMP_TO';
            if (isInternal) return false;

            if (indent.status === 'PENDING_MTC' || indent.status === 'APPROVED') return true;

            if (indent.status === 'REJECTED') {
                // Only show if MTC was the one who rejected it
                const logs = (indent.approvalLogs as any[]) || [];
                const mtcRejection = logs.find(l => l.stage === 'APPROVER_MTC' && l.status === 'REJECTED');
                return !!mtcRejection;
            }

            return false;
        }
        return true;
    });

    const handleDecision = async (indentId: string, decision: 'APPROVED' | 'REJECTED') => {
        const state = actionState[indentId] || { reason: '', loading: false };

        if (decision === 'REJECTED' && !state.reason.trim()) {
            alert("Please provide a reason for rejection.");
            return;
        }

        // MTC Validation
        if (user.role === 'APPROVER_MTC' && decision === 'APPROVED') {
            if (!state.toName?.trim()) {
                alert("Please input the Transport Operator Name.");
                return;
            }
            if (!state.isQualified) {
                alert("You must confirm the driver's qualification.");
                return;
            }
        }

        updateActionState(indentId, 'loading', true);

        let nextStatus: any = decision; // Default to REJECTED or APPROVED (Final)

        if (decision === 'APPROVED') {
            const indent = indents.find(i => i.id === indentId);
            if (!indent) return;

            if (user.role === 'APPROVER_AS3') nextStatus = 'PENDING_S3';
            else if (user.role === 'APPROVER_S3') {
                const isInternal = indent.typeOfIndent === 'SELF_DRIVE' || indent.typeOfIndent === 'INCAMP_TO';
                nextStatus = isInternal ? 'APPROVED' : 'PENDING_MTC';
            }
            else if (user.role === 'APPROVER_MTC') nextStatus = 'APPROVED';
        }

        const res = await updateIndentStatus(indentId, nextStatus, user.id, state.reason, state.toName);
        if (res.success) {
            refreshData();
        } else {
            alert("Action failed: " + res.error);
            updateActionState(indentId, 'loading', false);
        }
    };

    const handleCancel = async (indentId: string) => {
        if (!confirm("Are you sure you want to cancel this indent?")) return;
        const res = await updateIndentStatus(indentId, 'CANCELLED', user.id, 'User Cancelled');
        if (res.success) refreshData();
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

                const canEdit = !['CANCELLED', 'REJECTED'].includes(indent.status) && user.role !== 'APPROVER_MTC';

                const isLoading = actionState[indent.id]?.loading;

                return (
                    <div key={indent.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ cursor: 'pointer' }} onClick={() => setSelectedIndent(indent)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 700, background: 'var(--bg-surface)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                        #{indent.serialNumber}
                                    </span>
                                    <span className={`status-badge status-${indent.status.toLowerCase()}`}>
                                        {indent.status.replace('_', ' ')}
                                    </span>
                                </div>

                                <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                                    {indent.purpose} <span style={{ fontSize: '0.9em', color: 'var(--fg-secondary)', fontWeight: 400 }}>({indent.vehicleType})</span>
                                </div>

                                {indent.status === 'REJECTED' && (() => {
                                    const logs = (indent.approvalLogs as any[]) || [];
                                    const rejection = logs.reverse().find(l => l.status === 'REJECTED');
                                    if (rejection) {
                                        return (
                                            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '4px', fontSize: '0.875rem' }}>
                                                <strong>Rejected by {rejection.approverName}:</strong> "{rejection.reason}"
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                <div style={{ color: 'var(--fg-secondary)', fontSize: '0.875rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <span>📅 {format(new Date(indent.startTime), 'dd MMM HH:mm')} - {format(new Date(indent.endTime), 'HH:mm')}</span>
                                    <span>📍 {indent.startLocation} → {indent.endLocation}</span>
                                    <span>👤 {(indent as any).requestor?.rank || ''} {(indent as any).requestor?.name || 'Unknown'}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-ghost" onClick={() => setSelectedIndent(indent)} title="View Details">
                                    <Eye size={18} />
                                </button>
                                {canEdit && (
                                    <button onClick={() => router.push(`/dashboard/indents/${indent.id}/edit`)} className="btn btn-ghost" title="Edit">
                                        <Edit size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Inline Action Area for Approvers */}
                        {canApprove && (
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                                {/* MTC Specific Inputs */}
                                {user.role === 'APPROVER_MTC' && (
                                    <div className="mb-4 space-y-3 border-b pb-3 border-gray-200">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-gray-700 uppercase">Transport Operator Name <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                className="input input-sm border-gray-300"
                                                placeholder="Rank & Name of Driver"
                                                value={actionState[indent.id]?.toName ?? ''}
                                                onChange={(e) => updateActionState(indent.id, 'toName', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <input
                                                type="checkbox"
                                                id={`qual-${indent.id}`}
                                                className="mt-1"
                                                checked={actionState[indent.id]?.isQualified || false}
                                                onChange={(e) => updateActionState(indent.id, 'isQualified', e.target.checked)}
                                            />
                                            <label htmlFor={`qual-${indent.id}`} className="text-xs font-bold leading-tight" style={{ color: '#000000' }}>
                                                I confirm that the assigned Transport Operator is fully qualified to drive the requested vehicle: <strong>{indent.vehicleType}</strong>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-secondary)', marginBottom: '0.25rem', display: 'block' }}>
                                            Comments / Rejection Reason
                                        </label>
                                        <input
                                            className="input"
                                            style={{ background: '#fff', color: '#000000', fontWeight: 500 }}
                                            placeholder="Optional for Approve, Required for Reject"
                                            value={actionState[indent.id]?.reason || ''}
                                            onChange={(e) => updateActionState(indent.id, 'reason', e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="btn"
                                            style={{ background: 'var(--status-danger)', color: 'white' }}
                                            onClick={() => handleDecision(indent.id, 'REJECTED')}
                                            disabled={isLoading}
                                        >
                                            <X size={16} /> Reject
                                        </button>
                                        <button
                                            className="btn"
                                            style={{ background: 'var(--status-success)', color: 'white' }}
                                            onClick={() => handleDecision(indent.id, 'APPROVED')}
                                            disabled={isLoading}
                                        >
                                            <Check size={16} /> {user.role === 'REQUESTOR' ? 'Confirm' : 'Approve'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MTC Post-Approval Edit (Edit TO Name) */}
                        {indent.status === 'APPROVED' && user.role === 'APPROVER_MTC' && (
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem', border: '1px dashed #cbd5e1' }}>
                                <div className="flex flex-col gap-3">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold uppercase mb-1 block" style={{ color: '#000000' }}>Update Transport Operator</label>
                                        <input
                                            type="text"
                                            className="input input-sm border-gray-300 w-full"
                                            placeholder="Rank & Name of Driver"
                                            value={actionState[indent.id]?.toName ?? indent.transportOperator ?? ''}
                                            onChange={(e) => updateActionState(indent.id, 'toName', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <input
                                            type="checkbox"
                                            id={`qual-update-${indent.id}`}
                                            className="mt-1"
                                            checked={actionState[indent.id]?.isQualified || false}
                                            onChange={(e) => updateActionState(indent.id, 'isQualified', e.target.checked)}
                                        />
                                        <label htmlFor={`qual-update-${indent.id}`} className="text-xs font-bold leading-tight" style={{ color: '#000000' }}>
                                            I confirm that this NEW Transport Operator is fully qualified to drive the requested vehicle: <strong>{indent.vehicleType}</strong>
                                        </label>
                                    </div>
                                    <button
                                        className="btn btn-sm bg-blue-600 text-white hover:bg-blue-700 w-full"
                                        onClick={async () => {
                                            const newName = actionState[indent.id]?.toName ?? indent.transportOperator;
                                            if (!newName?.trim()) return alert("Name cannot be empty");

                                            // Validate Qualification Checkbox
                                            if (!actionState[indent.id]?.isQualified) {
                                                alert("You must confirm the driver's qualification updates.");
                                                return;
                                            }

                                            updateActionState(indent.id, 'loading', true);
                                            // Import this! I will replace import line separately.
                                            const { updateTransportOperator } = await import('@/app/actions/indents');
                                            const res = await updateTransportOperator(indent.id, newName);

                                            if (res.success) {
                                                refreshData();
                                                alert("Transport Operator Updated");
                                                // Reset qual check?
                                                updateActionState(indent.id, 'isQualified', false);
                                            } else {
                                                alert("Update failed");
                                            }
                                            updateActionState(indent.id, 'loading', false);
                                        }}
                                        disabled={isLoading}
                                    >
                                        Update TO & Confirm Qualification
                                    </button>
                                </div>
                            </div>
                        )}

                        {canCancel && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => handleCancel(indent.id)} className="btn btn-ghost" style={{ color: 'var(--status-danger)' }}>
                                    Cancel Indent
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Indent Details Modal */}
            {selectedIndent && <IndentDetailsModal indent={selectedIndent} onClose={() => setSelectedIndent(null)} />}
        </div>
    );
}
