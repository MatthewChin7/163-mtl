import { User, UserRole } from '@/types';
import { db } from './store';

// Simulating a session
let currentUser: User | null = null;

export const auth = {
    login: (email: string, role?: UserRole, password?: string): User | null => { // role param kept for legacy compatibility but password preferred
        const users = db.users.getAll();
        const user = users.find(u => u.email === email && (password ? u.password === password : true));

        if (user) {
            if (user.status !== 'ACTIVE') {
                console.warn('User pending approval');
                return null; // Handle UI feedback separately if needed, currently returns null generic failure
            }
            currentUser = user;
            if (typeof window !== 'undefined') {
                localStorage.setItem('currentUser', JSON.stringify(user));
            }
            return user;
        }
        return null;
    },

    register: (name: string, email: string, password: string): boolean => {
        const users = db.users.getAll();
        if (users.some(u => u.email === email)) return false; // Email taken

        const newUser: User = {
            id: crypto.randomUUID(),
            name,
            email,
            password,
            role: 'REQUESTOR', // Default role
            status: 'PENDING',
            unit: 'Unknown'
        };

        db.users.add(newUser);
        return true;
    },

    logout: () => {
        currentUser = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('currentUser');
        }
    },

    getCurrentUser: (): User | null => {
        // Try to rehydrate from storage if on client
        if (!currentUser && typeof window !== 'undefined') {
            const stored = localStorage.getItem('currentUser');
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
