'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Fetch roster for a date range
export async function getDutyRoster(startDate: Date, endDate: Date) {
    try {
        const roster = await prisma.dutyRoster.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Convert dates to ISO strings for client
        return roster.map(r => ({
            ...r,
            date: r.date.toISOString(),
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString()
        }));
    } catch (error) {
        console.error('Failed to fetch duty roster:', error);
        return [];
    }
}

// Update or Create a roster entry for a specific date
export async function updateDutyRoster(date: Date, rankName: string) {
    try {
        // Upsert: Create if new, update if exists (based on unique date)
        await prisma.dutyRoster.upsert({
            where: { date: date },
            update: { rankName },
            create: {
                date: date,
                rankName
            }
        });
        revalidatePath('/dashboard/mtc-schedule');
        return { success: true };
    } catch (error) {
        console.error('Failed to update duty roster:', error);
        return { success: false, error: 'Failed to save duty roster' };
    }
}
