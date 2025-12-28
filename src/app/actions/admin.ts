'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { SignJWT } from 'jose';

const ALG = 'HS256';

export async function generateImpersonationToken(targetUserId: string) {
    const session = await auth();

    // 1. Strict Security Check
    if (!session || !session.user || (session.user as any).role !== 'ADMIN') {
        throw new Error('Unauthorized: Only Admins can generate impersonation tokens');
    }

    // 2. Verify Target Exists
    const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId }
    });

    if (!targetUser) {
        throw new Error('Target user not found');
    }

    // 3. Generate Token
    // We use 'jose' as it is edge-compatible (unlike jsonwebtoken) and already likely a dependency of next-auth
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

    const token = await new SignJWT({
        sub: targetUserId,
        adminId: session.user.id,
        isImpersonation: true
    })
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt()
        .setExpirationTime('1h') // 1 hour validity
        .sign(secret);

    return { token };
}
