import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma" // Use absolute import
import { loginUserAction } from "@/app/actions/users"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { UserRole } from "@/types"
import { jwtVerify } from 'jose'

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma) as any,
    providers: [
        Credentials({
            credentials: {
                email: {},
                password: {},
                impersonationToken: {}
            },
            authorize: async (credentials) => {
                // 1. Check for Impersonation Token
                if (credentials?.impersonationToken) {
                    try {
                        const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
                        const { payload } = await jwtVerify(credentials.impersonationToken as string, secret);

                        // Verify payload structure
                        if (payload.isImpersonation && payload.sub) {
                            // Fetch the target user
                            const user = await prisma.user.findUnique({ where: { id: payload.sub } });
                            if (user) return { ...user, isImpersonation: true };
                        }
                    } catch (e) {
                        console.error("Impersonation token verification failed", e);
                        return null;
                    }
                }

                // 2. Normal Login Flow
                if (!credentials?.email || !credentials?.password) return null
                const user = await loginUserAction(credentials.email as string, credentials.password as string)
                if (!user || 'error' in user) return null

                return user
            },
        }),
    ],
    session: { strategy: "jwt" },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                // Cast user to any because NextAuth User type is restrictive by default
                const u = user as any;
                token.role = u.role;
                token.id = u.id;
                token.status = u.status;
                if (u.isImpersonation) token.isImpersonation = true;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                const s = session.user as any;
                s.role = token.role as UserRole;
                s.id = token.id as string;
                s.status = token.status as string;
                if (token.isImpersonation) s.isImpersonation = true;
            }
            return session;
        }
    }
})
