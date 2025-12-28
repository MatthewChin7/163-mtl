'use server'

import { prisma } from '@/lib/prisma';
import { addVehicle, addLocation, addRPLTime, updateSystemSetting } from './config';

export async function seedInitialConfig() {
    console.log("Seeding Initial Config...");

    // 1. Vehicles
    const vehicles = [
        'OUV', 'S/OUV', 'LUV', 'MSV_8x8', 'LM_8x8', 'DLS_8x8',
        'MWEC_8x8', 'TCP_6x6', 'GS_6TON', 'SKIDTANKER_5TON', 'GP_CAR', 'MINIBUS'
    ];
    for (const v of vehicles) {
        await prisma.vehicleConfig.upsert({
            where: { name: v },
            update: {},
            create: { name: v }
        });
    }

    // 2. Locations (In Camp)
    const locationsIn = ['LCK II', 'Tarmac', 'MT Park 1', 'MT Park 2', 'H20'];
    for (const l of locationsIn) {
        await prisma.locationConfig.upsert({
            where: { name: l },
            update: { category: 'IN_CAMP' },
            create: { name: l, category: 'IN_CAMP', restrictedAuthority: ['Tarmac', 'H20'].includes(l) ? '160SQN' : null }
        });
    }

    // 3. Locations (Out Camp)
    const locationsOut = ['ME', 'JC'];
    for (const l of locationsOut) {
        await prisma.locationConfig.upsert({
            where: { name: l },
            update: { category: 'OUT_CAMP' },
            create: { name: l, category: 'OUT_CAMP' }
        });
    }

    // 4. RPL
    const rplArrive = ['11:45am', '3:30pm'];
    for (const t of rplArrive) {
        try { await addRPLTime(t, 'ARRIVE'); } catch { }
    }
    const rplDepart = ['12:30pm', '4:30pm'];
    for (const t of rplDepart) {
        try { await addRPLTime(t, 'DEPART'); } catch { }
    }

    // 5. System Settings
    await updateSystemSetting('INDENT_NOTICE_DAYS', '10', 'Minimum advance notice for Normal Indents');
    await updateSystemSetting('SYSTEM_BANNER', '', 'Message to display on dashboard');

    console.log("Seeding Complete.");
    return { success: true };
}
