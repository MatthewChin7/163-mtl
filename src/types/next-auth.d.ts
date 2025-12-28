import { UserRole } from ".";
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            id: string;
            role: UserRole;
            status: string;
        } & DefaultSession["user"]
    }

    interface User {
        role: UserRole;
        status: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: UserRole;
        id: string;
        status: string;
    }
}
