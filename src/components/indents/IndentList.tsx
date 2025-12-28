'use client';

import { Indent, User } from '@/types';
// import { db } from '@/lib/store'; // Removed mock store usage
import { useState } from 'react';
import { Check, X, Eye, Edit, RotateCcw, Plus, Info, Trash2, Send } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface IndentListProps {
    indents: Indent[];
    user: User;
    refreshData: () => void;
    filter?: 'ALL' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'CANCELLED';
}

import { updateIndentStatus, updateTransportOperator, deleteIndent, updateIndent } from '@/app/actions/indents';
import { useToast } from '@/components/ui/Toast'; // Import toast
import IndentDetailsModal from './IndentDetailsModal';

export default function IndentList({ indents, user, refreshData, filter = 'ALL' }: IndentListProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [selectedIndent, setSelectedIndent] = useState<Indent | null>(null);
    const [actionState, setActionState] = useState<{ [key: string]: { reason: string, loading: boolean, toName?: string, isQualified?: boolean } }>({});

    const updateActionState = (id: string, field: string, value: any) => {
        setActionState(prev => ({
            ...prev,
            [id]: { ...(prev[id] || { reason: '', loading: false }), [field]: value }
        }));
    };

    const visibleIndents = indents.filter(indent => {
        // Apply general filter first
        if (filter === 'DRAFT' && indent.status !== 'DRAFT') return false;
        if (filter === 'PENDING' && !indent.status.includes('PENDING')) return false;
        if (filter === 'APPROVED' && indent.status !== 'APPROVED') return false;
        if (filter === 'CANCELLED' && !(indent.status === 'CANCELLED' || indent.status === 'REJECTED')) return false;

        // ... existing MTC logic ...
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

    const handleCancel = async (indent: Indent) => {
        const reason = prompt("Please input a reason for cancellation:");
        if (reason === null) return; // Cancelled prompt

        let nextStatus: any = 'CANCELLED';

        if (indent.status === 'APPROVED') {
            nextStatus = 'CANCEL_PENDING_AS3';
        }

        const res = await updateIndentStatus(indent.id, nextStatus, user.id, reason || 'User Cancelled');
        if (res.success) {
            refreshData();
            showToast(indent.status === 'APPROVED' ? "Cancellation request submitted." : "Indent cancelled.", 'success');
        } else {
            showToast("Failed to cancel: " + res.error, 'error');
        }
    };

    const handleDeleteDraft = async (indentId: string) => {
        if (!confirm('Are you sure you want to delete this draft?')) return;

        updateActionState(indentId, 'loading', true);
        const res = await deleteIndent(indentId);
        if (res.success) {
            showToast("Draft deleted.", 'success');
            refreshData();
        } else {
            showToast("Failed to delete: " + res.error, 'error');
            updateActionState(indentId, 'loading', false);
        }
    };

    const handleSubmitDraft = async (indentId: string) => {
        // Submit logic: Update to PENDING_AS3
        if (!confirm('Submit this indent for approval?')) return;

        updateActionState(indentId, 'loading', true);
        // We reuse updateIndentStatus? Or updateIndent?
        // updateIndent is for full payload. updateIndentStatus is for status transition.
        // Assuming draft is valid, we can just transition status?
        // But wait, updateIndentStatus usually appends a log.
        // If we use updateIndent, we can pass { submit: true }.
        // Let's use updateIndentStatus if logic permits, OR import updateIndent if needed to be safe.
        // Actually, IndentForm used updateIndent with { submit: true }.
        // But here we are just changing status.
        // Let's use updateIndentStatus to 'PENDING_AS3'.
        // Wait, getNextStatus checks role.
        // If I use updateIndentStatus('PENDING_AS3'), does it work?
        // updateIndentStatus logic: "else if (status === 'APPROVED') ... else { REJECTION } ... "
        // It treats anything not APPROVED/CANCELLED as REJECTED in log!
        // See lines 191: "else { // REJECTION (Normal) logs.push REJECTED ... }"
        // So updateIndentStatus is mainly for Approvals/Rejections.
        // To submit a DRAFT, we should use updateIndent with { submit: true } OR create a specific submit action?
        // Or updateIndentStatus should handle 'PENDING_AS3' explicitly?
        // looking at `updateIndentStatus` in `indents.ts` (lines 99+), it logs REJECTED for unknown statuses.
        // So I should use `updateIndent` with `submit: true` to trigger the submit flow properly.
        // I need to import `updateIndent` as well.

        // Let's re-import updateIndent in the top block first.
        // const { updateIndent } = await import('@/app/actions/indents');

        const res = await updateIndent(indentId, { submit: true }, user.id);
        if (res.success) {
            showToast("Indent submitted successfully.", 'success');
            refreshData();
        } else {
            showToast("Failed to submit: " + res.error, 'error');
            updateActionState(indentId, 'loading', false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex justify-end items-center gap-4 border-b border-gray-200 pb-2">
                <button
                    onClick={() => router.push('/dashboard/new-indent')}
                    className="btn btn-primary whitespace-nowrap flex items-center gap-2"
                >
                    <Plus size={18} /> New Indent
                </button>
            </div>

            {visibleIndents.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                    <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-4 bg-white rounded-full shadow-sm">
                            <span className="text-4xl">📭</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No indents found</h3>
                        <p className="text-sm max-w-sm mx-auto">
                            {filter === 'ALL'
                                ? "You haven't created any transport requests yet."
                                : `No requests found in ${filter.toLowerCase()} status.`}
                        </p>
                        {filter === 'ALL' && (
                            <button
                                onClick={() => router.push('/dashboard/new-indent')}
                                className="btn btn-outline mt-4"
                            >
                                Get Started
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {visibleIndents.map(indent => {
                        const canApprove = (
                            (user.role === 'APPROVER_AS3' && (indent.status === 'PENDING_AS3' || indent.status === 'CANCEL_PENDING_AS3')) ||
                            (user.role === 'APPROVER_S3' && (indent.status === 'PENDING_S3' || indent.status === 'CANCEL_PENDING_S3')) ||
                            (user.role === 'APPROVER_MTC' && (indent.status === 'PENDING_MTC' || indent.status === 'CANCEL_PENDING_MTC')) ||
                            (user.role === 'REQUESTOR' && indent.status === 'PENDING_REQUESTOR' && indent.requestorId === user.id)
                        );

                        const canCancel = (
                            indent.requestorId === user.id &&
                            !['CANCELLED', 'REJECTED'].includes(indent.status) &&
                            !indent.status.startsWith('CANCEL_PENDING')
                        );

                        const isCancellationRequest = indent.status.startsWith('CANCEL_PENDING');
                        const canEdit = !['CANCELLED', 'REJECTED', 'APPROVED'].includes(indent.status) && !isCancellationRequest && user.role !== 'APPROVER_MTC';
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
                                                {indent.status.replace(/_/g, ' ')}
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

                                        {isCancellationRequest && (
                                            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fef08a', color: '#854d0e', borderRadius: '4px', fontSize: '0.875rem' }}>
                                                <strong>Cancellation Requested</strong> - Pending Approval
                                            </div>
                                        )}

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

                                {canApprove && (
                                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                                        {isCancellationRequest && (
                                            <div className="mb-2 font-bold text-orange-600">⚠ Reviewing Cancellation Request</div>
                                        )}

                                        {user.role === 'APPROVER_MTC' && !isCancellationRequest && (
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
                                                    {isCancellationRequest ? 'Reason for Decision' : 'Comments / Rejection Reason'}
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
                                                    <X size={16} /> {isCancellationRequest ? 'Reject Cancel' : 'Reject'}
                                                </button>
                                                <button
                                                    className="btn"
                                                    style={{ background: 'var(--status-success)', color: 'white' }}
                                                    onClick={() => handleDecision(indent.id, 'APPROVED')}
                                                    disabled={isLoading}
                                                >
                                                    <Check size={16} />
                                                    {
                                                        isCancellationRequest ? 'Approve Cancel' :
                                                            (user.role === 'REQUESTOR' ? 'Confirm' : 'Approve')
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

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

                                                    if (!actionState[indent.id]?.isQualified) {
                                                        alert("You must confirm the driver's qualification updates.");
                                                        return;
                                                    }

                                                    updateActionState(indent.id, 'loading', true);
                                                    // const { updateTransportOperator } = await import('@/app/actions/indents'); // Removed dynamic import
                                                    const res = await updateTransportOperator(indent.id, newName);

                                                    if (res?.success) {
                                                        refreshData();
                                                        alert("Transport Operator Updated");
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

                                {indent.status === 'DRAFT' && indent.requestorId === user.id && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleDeleteDraft(indent.id)}
                                            className="btn btn-ghost"
                                            style={{ color: 'var(--status-danger)' }}
                                            disabled={isLoading}
                                        >
                                            <Trash2 size={16} style={{ marginRight: '0.25rem' }} /> Delete Draft
                                        </button>
                                        <button
                                            onClick={() => handleSubmitDraft(indent.id)}
                                            className="btn btn-primary btn-sm"
                                            disabled={isLoading}
                                        >
                                            <Send size={16} style={{ marginRight: '0.25rem' }} /> Submit
                                        </button>
                                    </div>
                                )}

                                {canCancel && indent.status !== 'DRAFT' && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button onClick={() => handleCancel(indent)} className="btn btn-ghost" style={{ color: 'var(--status-danger)' }}>
                                            {indent.status === 'APPROVED' ? 'Request Cancellation' : 'Cancel Indent'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedIndent && <IndentDetailsModal indent={selectedIndent} onClose={() => setSelectedIndent(null)} />}
        </div>
    );
}
