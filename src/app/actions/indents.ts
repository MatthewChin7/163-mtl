'use server'

import { prisma } from '@/lib/prisma';
import { Indent, IndentStatus, UserRole } from '@/types';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';

export async function createIndent(data: any, userId: string, initialStatus: IndentStatus = 'DRAFT') {
    try {
        const { waypoints, ...rest } = data;

        await prisma.indent.create({
            data: {
                ...rest,
                requestorId: userId,
                // Ensure dates are actual Date objects if passed as strings
                startTime: new Date(rest.startTime),
                endTime: new Date(rest.endTime),
                waypoints: waypoints ? JSON.parse(JSON.stringify(waypoints)) : [], // Ensure JSON compatibility
                approvalLogs: [],
                status: initialStatus
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

export async function updateIndentStatus(indentId: string, status: IndentStatus, approverId: string, reason?: string) {
    try {
        // Fetch current indent to append log
        const current = await prisma.indent.findUnique({ where: { id: indentId } });
        if (!current) throw new Error('Indent not found');

        const logs = (current.approvalLogs as any[]) || [];
        // Ideally fetch approver details to add name, but simplified for now
        const approver = await prisma.user.findUnique({ where: { id: approverId } });

        logs.push({
            stage: approver?.role || 'UNKNOWN',
            status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
            timestamp: new Date().toISOString(),
            approverId,
            approverName: approver?.name || 'Unknown',
            reason
        });

        await prisma.indent.update({
            where: { id: indentId },
            data: {
                status,
                approvalLogs: logs, // Prisma handles JSON array
                reason: reason || current.reason
            }
        });

        // Send Email to Requestor if decision is made
        if (status === 'APPROVED' || status === 'REJECTED') {
            // In real app, fetch requestor email. Assuming we have generic contact for now
            await sendEmail({
                to: 'user@163.mil',
                subject: `Indent #${current.serialNumber} ${status}`,
                html: `<p>Your indent <strong>#${current.serialNumber}</strong> has been <strong>${status}</strong> by ${approver?.role}.</p>`
            });
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Failed to update status:', error);
        return { success: false, error: 'Update Failed' };
    }
}

export async function updateIndent(indentId: string, data: any) {
    try {
        const { waypoints, ...rest } = data;

        // Exclude fields that shouldn't be updated directly or handled separately
        // e.g. serialNumber, createdAt, requestorId
        const { serialNumber, createdAt, requestorId, id, ...updateData } = rest;

        await prisma.indent.update({
            where: { id: indentId },
            data: {
                ...updateData,
                startTime: new Date(updateData.startTime),
                endTime: new Date(updateData.endTime),
                waypoints: waypoints ? JSON.parse(JSON.stringify(waypoints)) : [],
            }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Failed to update indent:', error);
        return { success: false, error: 'Update Failed' };
    }
}
