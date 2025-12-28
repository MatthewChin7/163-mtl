'use server'

import { prisma } from '@/lib/prisma';
import { User, UserRole } from '@/types';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';

export async function registerUserAction(name: string, email: string, password: string, role: UserRole = 'REQUESTOR') {
    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return { success: false, error: 'Email already exists' };

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                status: 'PENDING',
                unit: '163 SQN'
            }
        });

        // Send Email to Admin (Mocked Admin Email)
        await sendEmail({
            to: 'admin@163.mil',
            subject: 'New User Registration Pending Approval',
            html: `<p>New user <strong>${name}</strong> (${email}) has registered as <strong>${role}</strong> and is pending approval.</p>`
        });

        return { success: true };
    } catch (error) {
        console.error('Registration failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Database Error' };
    }
}

export async function loginUserAction(email: string, password: string) {
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return null;

        if (user.status !== 'ACTIVE') return { error: 'PENDING_APPROVAL' }; // Special marker

        // Remove sensitive data
        const { password: _, ...cleanUser } = user;
        return cleanUser;
    } catch (error) {
        console.error('Login failed:', error);
        return null;
    }
}

export async function getPendingUsers() {
    return await prisma.user.findMany({
        where: { status: 'PENDING' }
    });
}

export async function getAllUsers() {
    return await prisma.user.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function updateUserStatus(userId: string, status: 'ACTIVE' | 'REJECTED') {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { status }
        });
        revalidatePath('/dashboard'); // Update admin panel
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Update failed' };
    }
}

export async function updateUserRole(userId: string, role: UserRole) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { role }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Update failed' };
    }
}

export async function deleteUserAction(userId: string) {
    try {
        await prisma.user.delete({
            where: { id: userId }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Delete failed' };
    }
}

export async function updateUserAction(userId: string, data: Partial<User>) {
    try {
        const updateData: any = {
            name: data.name,
            email: data.email,
            role: data.role,
            rank: data.rank,
            unit: data.unit,
        };
        // Only update password if provided
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Update failed' };
    }
}

export async function updateUserProfile(userId: string, data: { name?: string, rank?: string, password?: string }) {
    try {
        const updateData: any = {
            ...data
        };
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        });
        revalidatePath('/dashboard/profile');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Profile update failed' };
    }
}

export async function requestRoleChange(userId: string, newRole: UserRole) {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return { success: false, error: 'User not found' };

        await prisma.roleRequest.create({
            data: {
                userId,
                currentRole: user.role,
                requestedRole: newRole,
                status: 'PENDING'
            }
        });

        await sendEmail({
            to: 'admin@163.mil',
            subject: 'Role Change Request',
            html: `<p>User <strong>${user.name}</strong> has requested to change role from ${user.role} to ${newRole}</p>`
        });
        return { success: true };
    } catch (error) {
        console.error('Role request failed', error);
        return { success: false, error: 'Request failed' };
    }
}
