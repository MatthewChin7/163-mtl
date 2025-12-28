'use server'

import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// 1. Request Password Reset (Called from Forgot Password Page)
export async function requestPasswordReset(email: string) {
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        // Security: Always return success even if email not found to prevent enumeration?
        // For friendly internal app, we can be more explicit, but best practice is secure.
        // Let's be truthful for now since it's an internal military app. 
        if (!user) {
            return { success: false, error: 'Email not found.' };
        }

        // Generate Token
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600 * 1000); // 1 Hour

        // Save Token
        await prisma.passwordResetToken.create({
            data: {
                email,
                token,
                expires
            }
        });

        // Send Email
        // Assuming APP_URL is set in env, else fallback
        const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const resetLink = `${appUrl}/reset-password?token=${token}`;

        await sendEmail({
            to: email,
            subject: 'Reset Your Password - 163 Sqn MT Line',
            html: `
                <p>You requested a password reset.</p>
                <p>Click the link below to set a new password:</p>
                <p><a href="${resetLink}">${resetLink}</a></p>
                <p>This link expires in 1 hour.</p>
            `
        });

        return { success: true };
    } catch (error) {
        console.error('Forgot Password Error:', error);
        return { success: false, error: 'Failed to process request.' };
    }
}

// 2. Reset Password (Called from Reset Password Page)
export async function resetPassword(token: string, newPassword: string) {
    try {
        // Validate Token
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token }
        });

        if (!resetToken) {
            return { success: false, error: 'Invalid or expired token.' };
        }

        if (newPassword.length < 6) return { success: false, error: 'Password too short' };

        if (new Date() > resetToken.expires) {
            // Cleanup expired
            await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
            return { success: false, error: 'Token expired.' };
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update User
        await prisma.user.update({
            where: { email: resetToken.email },
            data: { password: hashedPassword }
        });

        // Delete Token (Consumed)
        await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });

        return { success: true };
    } catch (error) {
        console.error('Reset Password Error:', error);
        return { success: false, error: 'Failed to reset password.' };
    }
}
