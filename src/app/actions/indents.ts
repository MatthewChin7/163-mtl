'use server'

import { prisma } from '@/lib/prisma';
import { Indent, IndentStatus, UserRole } from '@/types';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';

// Helper to determine next status based on Role Hierarchy
function getNextStatus(role: UserRole): IndentStatus {
    switch (role) {
        case 'REQUESTOR': return 'PENDING_AS3';
        case 'APPROVER_AS3': return 'PENDING_S3';
        case 'APPROVER_S3': return 'PENDING_MTC';
        case 'APPROVER_MTC': return 'APPROVED';
        default: return 'PENDING_AS3';
    }
}

export async function createIndent(data: any, userId: string, initialStatus?: IndentStatus) {
    try {
        const { waypoints, ...rest } = data;

        // Fetch user to determine Role and Skip Logic
        const user = await prisma.user.findUnique({ where: { id: userId } });

        // If Draft is requested, honor it. Otherwise calculate based on Role.
        let status: IndentStatus = 'PENDING_AS3';
        if (initialStatus === 'DRAFT') {
            status = 'DRAFT';
        } else {
            status = user ? getNextStatus(user.role) : 'PENDING_AS3';
        }

        await prisma.indent.create({
            data: {
                ...rest,
                requestorId: userId,
                // Ensure dates are actual Date objects if passed as strings
                startTime: new Date(rest.startTime),
                endTime: new Date(rest.endTime),
                waypoints: waypoints ? JSON.parse(JSON.stringify(waypoints)) : [], // Ensure JSON compatibility
                approvalLogs: [],
                status: status
            }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Failed to create indent:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Database Error' };
    }
}

export async function getIndents(userId?: string) {
    try {
        const indents = await prisma.indent.findMany({
            where: {
                OR: [
                    { status: { not: 'DRAFT' } }, // Show all non-drafts
                    {
                        AND: [
                            { status: 'DRAFT' },
                            { requestorId: userId } // Show drafts only if owner
                        ]
                    }
                ]
            },
            include: {
                requestor: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Map Prisma result to our frontend Indent type if needed, 
        // mainly converting Dates to strings if your UI expects strings
        // or ensure UI can handle Date objects.
        // For now, returning as is (Next.js serializes Date to string in Server Components but better to be explicit)
        return indents;
    } catch (error) {
        console.error('Failed to fetch indents:', error);
        return [];
    }
}

export async function getIndent(indentId: string) {
    try {
        const indent = await prisma.indent.findUnique({
            where: { id: indentId }
        });
        return indent;
    } catch (error) {
        console.error('Failed to fetch indent:', error);
        return null;
    }
}

export async function updateIndentStatus(indentId: string, status: IndentStatus, approverId: string, reason?: string, transportOperatorName?: string) {
    try {
        // Fetch current indent to append log
        const current = await prisma.indent.findUnique({ where: { id: indentId } });
        if (!current) throw new Error('Indent not found');

        const logs = (current.approvalLogs as any[]) || [];
        const approver = await prisma.user.findUnique({ where: { id: approverId } });
        const approverRole = approver?.role || 'UNKNOWN';

        let nextStatus = status;

        // SMART ROUTING LOGIC (If Requestor Accepts Changes i.e. APPROVED from PENDING_REQUESTOR)
        if (current.status === 'PENDING_REQUESTOR' && status === 'APPROVED') {
            // Need to skip the Editor's role
            const editorRole = current.editorRole;
            if (editorRole) {
                // If AS3 edited, next should be S3.
                nextStatus = getNextStatus(editorRole);
            } else {
                nextStatus = 'PENDING_AS3'; // Default reset if unknown
            }
            logs.push({
                stage: 'REQUESTOR',
                status: 'APPROVED',
                timestamp: new Date().toISOString(),
                approverId,
                approverName: approver?.name || 'Requestor',
                reason: 'Accepted Changes'
            });
        }
        // CANCELLATION WORKFLOW
        else if (status === 'CANCEL_PENDING_AS3') {
            // Requestor initiating cancellation
            nextStatus = 'CANCEL_PENDING_AS3';
            logs.push({
                stage: 'REQUESTOR',
                status: 'CANCEL_REQUESTED',
                timestamp: new Date().toISOString(),
                approverId,
                approverName: approver?.name || 'Requestor',
                reason: reason || 'Cancellation Requested'
            });
        }
        else if (current.status.startsWith('CANCEL_PENDING_') && status === 'APPROVED') {
            // Approving Cancellation
            if (current.status === 'CANCEL_PENDING_AS3') nextStatus = 'CANCEL_PENDING_S3';
            else if (current.status === 'CANCEL_PENDING_S3') nextStatus = 'CANCEL_PENDING_MTC';
            else if (current.status === 'CANCEL_PENDING_MTC') nextStatus = 'CANCELLED';

            logs.push({
                stage: approverRole,
                status: 'CANCEL_APPROVED',
                timestamp: new Date().toISOString(),
                approverId,
                approverName: approver?.name || 'Unknown',
                reason: reason || 'Cancellation Approved'
            });
        }
        else if (current.status.startsWith('CANCEL_PENDING_') && status === 'REJECTED') {
            // Rejecting Cancellation -> Revert to APPROVED (Indent remains valid)
            nextStatus = 'APPROVED';
            logs.push({
                stage: approverRole,
                status: 'CANCEL_REJECTED',
                timestamp: new Date().toISOString(),
                approverId,
                approverName: approver?.name || 'Unknown',
                reason: reason || 'Cancellation Rejected'
            });
        }
        // NORMAL APPROVAL LOGIC
        else if (status === 'APPROVED') {
            logs.push({
                stage: approverRole,
                status: 'APPROVED',
                timestamp: new Date().toISOString(),
                approverId,
                approverName: approver?.name || 'Unknown',
                reason
            });
        }
        else if (status === 'CANCELLED') {
            logs.push({
                stage: approverRole,
                status: 'CANCELLED',
                timestamp: new Date().toISOString(),
                approverId,
                approverName: approver?.name || 'Unknown',
                reason: reason || 'Indent Withdrawn'
            });
        }
        else {
            // REJECTION (Normal)
            logs.push({
                stage: approverRole,
                status: 'REJECTED',
                timestamp: new Date().toISOString(),
                approverId,
                approverName: approver?.name || 'Unknown',
                reason
            });
        }

        await prisma.indent.update({
            where: { id: indentId },
            data: {
                status: nextStatus,
                approvalLogs: logs,
                // reason: reason || current.reason, // Do NOT overwrite justification
                cancellationReason: (status === 'REJECTED' || status === 'CANCELLED') ? reason : current.cancellationReason,
                transportOperator: transportOperatorName || current.transportOperator,
                previousStatus: current.status // Audit trail
            }
        });

        // Email logic (simplified)
        if (nextStatus === 'APPROVED' || nextStatus === 'REJECTED') {
            // In real app, fetch requestor email. Assuming we have generic contact for now
            await sendEmail({
                to: 'user@163.mil',
                subject: `Indent #${current.serialNumber} ${nextStatus}`,
                html: `<p>Your indent <strong>#${current.serialNumber}</strong> has been <strong>${nextStatus}</strong> by ${approver?.role
                    }.</p>${transportOperatorName ? `<p><strong>Transport Operator:</strong> ${transportOperatorName}</p>` : ''
                    }`
            });
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Failed to update status:', error);
        return { success: false, error: 'Update Failed' };
    }
}

export async function updateIndent(indentId: string, data: any, editorUserId?: string) {
    try {
        const { waypoints, submit, ...rest } = data; // specific submit flag
        const { serialNumber, createdAt, requestorId, id, ...updateData } = rest;

        // Base update data
        let finalUpdateData: any = {
            ...updateData,
        };

        if (updateData.startTime) {
            finalUpdateData.startTime = new Date(updateData.startTime);
        }
        if (updateData.endTime) {
            finalUpdateData.endTime = new Date(updateData.endTime);
        }
        if (waypoints) {
            finalUpdateData.waypoints = JSON.parse(JSON.stringify(waypoints));
        }

        // Status Logic
        if (editorUserId) {
            const editor = await prisma.user.findUnique({ where: { id: editorUserId } });

            // 1. Approver Edit Logic
            if (editor && (editor.role === 'APPROVER_AS3' || editor.role === 'APPROVER_S3')) {
                finalUpdateData.status = 'PENDING_REQUESTOR';
                finalUpdateData.editorRole = editor.role;

                // Fetch current to save previous status
                // (Ideally check if status changes, but for Approver Edit -> Requestor, yes)
                const current = await prisma.indent.findUnique({ where: { id: indentId } });
                if (current) finalUpdateData.previousStatus = current.status;
            }

            // 2. Draft Submission Logic (Requestor submitting draft)
            // If explicit "submit" flag is true
            if (submit && editor) {
                // Calculate Next Status
                const nextStatus = getNextStatus(editor.role);
                // Only update status if it's currently DRAFT? 
                // Or blind update? Blind update allows re-submission if stuck? 
                // Assume transitions from DRAFT.
                finalUpdateData.status = nextStatus;
            }
        }

        await prisma.indent.update({
            where: { id: indentId },
            data: finalUpdateData
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Failed to update indent:', error);
        return { success: false, error: 'Update Failed' };
    }
}

export async function updateTransportOperator(indentId: string, transportOperatorName: string) {
    try {
        await prisma.indent.update({
            where: { id: indentId },
            data: { transportOperator: transportOperatorName }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
    }
}

export async function deleteIndent(indentId: string) {
    try {
        await prisma.indent.delete({
            where: { id: indentId }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete indent:', error);
        return { success: false, error: 'Delete Failed' };
    }
}
