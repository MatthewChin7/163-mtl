import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma" // Use absolute import
import { loginUserAction } from "@/app/actions/users"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { UserRole } from "@/types"

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma) as any,
    providers: [
        Credentials({
            credentials: {
                email: {},
                password: {},
            },
            authorize: async (credentials) => {
                if (!credentials?.email || !credentials?.password) return null

                const user = await loginUserAction(credentials.email as string, credentials.password as string)

                if (!user || 'error' in user) {
                    return null
                }

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
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                const s = session.user as any;
                s.role = token.role as UserRole;
                s.id = token.id as string;
                s.status = token.status as string;
            }
            return session;
        }
    }
})
