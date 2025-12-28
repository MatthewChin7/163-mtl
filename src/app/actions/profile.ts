'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateUserImage(base64Image: string) {
    const session = await auth();
    if (!session || !session.user) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { image: base64Image }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        console.error('Failed to update profile image', e);
        return { success: false, error: 'Failed to update image' };
    }
}
