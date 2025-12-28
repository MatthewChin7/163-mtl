'use server';

import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, differenceInDays, parseISO, differenceInHours } from 'date-fns';

export async function getAnalyticsData() {
    try {
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);

        // Fetch all indents for potential heavy analysis
        // In production, optimize this with raw SQL or smaller queries, but for now Prisma findMany is fine.
        const indents = await prisma.indent.findMany({
            where: {
                status: {
                    not: 'DRAFT'
                }
            },
            // approvalLogs: true // To find cancellation time
        });

        // --- Core Metrics (HUD) ---
        const totalIndents = indents.filter(i => i.status !== 'CANCELLED' && i.status !== 'REJECTED').length;
        const totalCancelled = indents.filter(i => i.status === 'CANCELLED').length;

        // Utilization: Unique days with at least one active movement
        const activeDays = new Set();
        indents.forEach(i => {
            if (['APPROVED', 'COMPLETED'].includes(i.status)) {
                activeDays.add(new Date(i.startTime).toDateString());
            }
        });
        const utilizationRate = Math.round((activeDays.size / 30) * 100);

        // --- Charts Data ---

        // 1. Purpose Breakddown
        const purposeCount: Record<string, number> = {};
        indents.forEach(i => {
            // Simplify purpose? Or just use raw string? Raw string might be messy.
            // Let's group commonly used keywords or just use top 5.
            // For now, raw count.
            const p = i.purpose.trim() || 'Unspecified';
            purposeCount[p] = (purposeCount[p] || 0) + 1;
        });
        const purposeData = Object.entries(purposeCount)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5

        // 2. Lead Time Analysis (Requests)
        // Buckets: <24h, 1-3d, 3-7d, >7d
        const leadTimeBuckets = { '< 24h': 0, '1-3 Days': 0, '3-7 Days': 0, '> 7 Days': 0 };

        indents.forEach(i => {
            const daysDiff = differenceInDays(new Date(i.startTime), new Date(i.createdAt));
            if (daysDiff < 1) leadTimeBuckets['< 24h']++;
            else if (daysDiff <= 3) leadTimeBuckets['1-3 Days']++;
            else if (daysDiff <= 7) leadTimeBuckets['3-7 Days']++;
            else leadTimeBuckets['> 7 Days']++;
        });

        const leadTimeData = Object.entries(leadTimeBuckets).map(([name, requests]) => ({ name, requests }));

        // 3. Cancellation Lead Time (Cancelled X days before start)
        const cancellationBuckets = { '< 24h Before': 0, '1-3 Days Before': 0, '> 3 Days Before': 0 };

        indents.filter(i => i.status === 'CANCELLED').forEach(i => {
            // Find cancellation log time
            const logs = (i.approvalLogs as any) || [];
            const cancelLog = logs.find((l: any) => l.status === 'CANCELLED' || l.action === 'CANCELLED'); // Check your log structure
            const cancelTime = cancelLog ? new Date(cancelLog.timestamp) : new Date(i.updatedAt);

            const hoursBeforeStart = differenceInHours(new Date(i.startTime), cancelTime);

            if (hoursBeforeStart < 24) cancellationBuckets['< 24h Before']++;
            else if (hoursBeforeStart < 72) cancellationBuckets['1-3 Days Before']++;
            else cancellationBuckets['> 3 Days Before']++;
        });

        const cancellationData = Object.entries(cancellationBuckets).map(([name, value]) => ({ name, value }));

        return {
            metrics: {
                totalIndents,
                totalCancelled,
                utilizationRate
            },
            charts: {
                purposeData,
                leadTimeData,
                cancellationData
            }
        };

    } catch (error) {
        console.error("Analytics Error:", error);
        return { metrics: { totalIndents: 0, totalCancelled: 0, utilizationRate: 0 }, charts: { purposeData: [], leadTimeData: [], cancellationData: [] } };
    }
}
