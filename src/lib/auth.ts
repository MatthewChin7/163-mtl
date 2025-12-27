import { User, UserRole } from '@/types';
import { db } from './store';

// Simulating a session
let currentUser: User | null = null;

export const auth = {
    login: (userId: string): User | null => {
        const user = db.users.getById(userId);
        if (user) {
            currentUser = user;
            // In a real app, we'd set a cookie/token here
            if (typeof window !== 'undefined') {
                localStorage.setItem('163-user', JSON.stringify(user));
            }
        }
        return currentUser;
    },

    logout: () => {
        currentUser = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('163-user');
        }
    },

    getCurrentUser: (): User | null => {
        // Try to rehydrate from storage if on client
        if (!currentUser && typeof window !== 'undefined') {
            const stored = localStorage.getItem('163-user');
            if (stored) {
                currentUser = JSON.parse(stored);
            }
        }
        return currentUser;
    },

    hasRole: (role: UserRole): boolean => {
        return currentUser?.role === role;
    }
};
