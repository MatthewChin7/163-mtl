'use server'

import { prisma } from '@/lib/prisma';
import { User, UserRole } from '@/types';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';

export async function registerUserAction(name: string, email: string, password: string) {
    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return { success: false, error: 'Email already exists' };

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password, // Note: Should hash this in production!
                role: 'REQUESTOR',
                status: 'PENDING',
                unit: '163 SQN'
            }
        });

        // Send Email to Admin (Mocked Admin Email)
        await sendEmail({
            to: 'admin@163.mil',
            subject: 'New User Registration Pending Approval',
            html: `<p>New user <strong>${name}</strong> (${email}) has registered and is pending approval.</p>`
        });

        return { success: true };
    } catch (error) {
        console.error('Registration failed:', error);
        return { success: false, error: 'Database Error' };
    }
}

export async function loginUserAction(email: string, password: string) {
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        if (user.password !== password) return null; // Plain text check for now (replace with bcrypt)
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
        where: { status: 'ACTIVE' },
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
