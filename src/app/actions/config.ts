'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// --- System Settings ---
export async function getSystemSettings() {
    try {
        const settings = await prisma.systemSetting.findMany();
        // Convert array to object for easier access
        const config: Record<string, string> = {};
        settings.forEach(s => config[s.key] = s.value);
        return config;
    } catch (e) {
        return {};
    }
}

export async function updateSystemSetting(key: string, value: string, description?: string) {
    try {
        await prisma.systemSetting.upsert({
            where: { key },
            update: { value, description },
            create: { key, value, description }
        });
        revalidatePath('/dashboard/admin/config');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed to update setting' };
    }
}

// --- Vehicles ---
export async function getVehicleConfigs() {
    return await prisma.vehicleConfig.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function getActiveVehicles() {
    return await prisma.vehicleConfig.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
    });
}

export async function toggleVehicle(id: string, isActive: boolean) {
    try {
        await prisma.vehicleConfig.update({
            where: { id },
            data: { isActive }
        });
        revalidatePath('/dashboard/admin/config');
        revalidatePath('/dashboard/new-indent');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed to toggle vehicle' };
    }
}

export async function addVehicle(name: string) {
    try {
        await prisma.vehicleConfig.create({
            data: { name, isActive: true }
        });
        revalidatePath('/dashboard/admin/config');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed to add vehicle' };
    }
}

// --- Locations ---
export async function getLocationConfigs() {
    return await prisma.locationConfig.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function getActiveLocations(category: 'IN_CAMP' | 'OUT_CAMP') {
    return await prisma.locationConfig.findMany({
        where: { isActive: true, category },
        orderBy: { name: 'asc' }
    });
}

export async function addLocation(name: string, category: 'IN_CAMP' | 'OUT_CAMP', restrictedAuthority?: string) {
    try {
        await prisma.locationConfig.create({
            data: { name, category, restrictedAuthority, isActive: true }
        });
        revalidatePath('/dashboard/admin/config');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed to add location' };
    }
}

export async function toggleLocation(id: string, isActive: boolean) {
    try {
        await prisma.locationConfig.update({
            where: { id },
            data: { isActive }
        });
        revalidatePath('/dashboard/admin/config');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed to toggle location' };
    }
}

// --- RPL ---
export async function getRPLSchedule() {
    return await prisma.rPLSchedule.findMany({
        orderBy: { time: 'asc' }
    });
}

export async function addRPLTime(time: string, type: 'ARRIVE' | 'DEPART') {
    try {
        await prisma.rPLSchedule.create({
            data: { time, type, isActive: true }
        });
        revalidatePath('/dashboard/admin/config');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed to add RPL time' };
    }
}

export async function toggleRPL(id: string, isActive: boolean) {
    try {
        await prisma.rPLSchedule.update({
            where: { id },
            data: { isActive }
        });
        revalidatePath('/dashboard/admin/config');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed to toggle RPL' };
    }
}

export async function deleteRPL(id: string) {
    try {
        await prisma.rPLSchedule.delete({
            where: { id }
        });
        revalidatePath('/dashboard/admin/config');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed to delete RPL time' };
    }
}
