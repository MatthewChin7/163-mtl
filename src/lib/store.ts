import { Indent, User, RoleRequest, DailyDutyDO } from '@/types';

// Mock Data
const MOCK_USERS: User[] = [
    { id: 'u1', name: 'Recruit Chau', role: 'REQUESTOR', rank: 'REC', unit: '163 SQN', email: 'chau@163.mil', status: 'ACTIVE' },
    { id: 'u2', name: 'LTA Tan', role: 'APPROVER_AS3', rank: 'LTA', unit: '163 SQN', email: 'tan@163.mil', status: 'ACTIVE' },
    { id: 'u3', name: 'MAJ Lee', role: 'APPROVER_S3', rank: 'MAJ', unit: 'HQ', email: 'lee@163.mil', status: 'ACTIVE' },
    { id: 'u4', name: 'WO Lim', role: 'APPROVER_MTC', rank: 'MSG', unit: 'MTC', email: 'lim@163.mil', status: 'ACTIVE' },
    { id: 'u5', name: '163 Ops Controller', role: 'ADMIN', email: 'ops@163.mil', rank: 'CPT', status: 'ACTIVE' },
];

let indents: Indent[] = [];
let roleRequests: RoleRequest[] = [];
let dailyDuties: DailyDutyDO[] = [];

// Store Accessors (simulating DB calls)
export const db = {
    users: {
        getAll: () => MOCK_USERS,
        getById: (id: string) => MOCK_USERS.find(u => u.id === id),
        add: (user: User) => MOCK_USERS.push(user),
        update: (id: string, updates: Partial<User>) => {
            const index = MOCK_USERS.findIndex(u => u.id === id);
            if (index !== -1) {
                MOCK_USERS[index] = { ...MOCK_USERS[index], ...updates };
                return MOCK_USERS[index]; // Return updated user
            }
            return null;
        }
    },
    roleRequests: {
        getAll: () => roleRequests,
        add: (req: RoleRequest) => roleRequests.push(req),
        update: (id: string, status: 'APPROVED' | 'REJECTED') => {
            const req = roleRequests.find(r => r.id === id);
            if (req) req.status = status;
        }
    },
    dailyDuties: {
        getAll: () => dailyDuties,
        getByDate: (date: string) => dailyDuties.find(d => d.date === date),
        set: (date: string, rankName: string) => {
            const existingIndex = dailyDuties.findIndex(d => d.date === date);
            if (existingIndex !== -1) {
                dailyDuties[existingIndex].rankName = rankName;
            } else {
                dailyDuties.push({ date, rankName });
            }
        }
    },
    indents: {
        getAll: () => [...indents],
        getById: (id: string) => indents.find(i => i.id === id),
        add: (indent: Indent) => {
            indents.push(indent);
            return indent;
        },
        update: (id: string, updates: Partial<Indent>) => {
            const index = indents.findIndex(i => i.id === id);
            if (index === -1) return null;
            indents[index] = { ...indents[index], ...updates };
            return indents[index];
        }
    }
};
