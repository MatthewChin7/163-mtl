'use client';

import { useState, useEffect } from 'react';
import {
    getVehicleConfigs, toggleVehicle, addVehicle, deleteVehicle,
    getLocationConfigs, toggleLocation, addLocation, deleteLocation,
    getRPLSchedule, deleteRPL, addRPLTime,
    getSystemSettings, updateSystemSetting
} from '@/app/actions/config';
import { seedInitialConfig } from '@/app/actions/seed';
import { Settings, Truck, MapPin, Clock, Plus, Power, Save, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';

export default function AdminConfigPage() {
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'VEHICLES' | 'LOCATIONS' | 'RPL'>('GENERAL');

    // Data State
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [rpl, setRpl] = useState<any[]>([]);
    const [settings, setSettings] = useState<Record<string, string>>({});

    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const refresh = () => setRefreshKey(k => k + 1);

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            getVehicleConfigs(),
            getLocationConfigs(),
            getRPLSchedule(),
            getSystemSettings()
        ]).then(([v, l, r, s]) => {
            setVehicles(v);
            setLocations(l);
            setRpl(r);
            setSettings(s);
            setIsLoading(false);
        });
    }, [refreshKey]);

    // Handlers
    const handleDeleteVehicle = async (id: string) => {
        if (!confirm("Are you sure you want to delete this vehicle?")) return;
        await deleteVehicle(id);
        refresh();
    };

    const handleDeleteLocation = async (id: string) => {
        if (!confirm("Are you sure you want to delete this location?")) return;
        await deleteLocation(id);
        refresh();
    };

    const handleDeleteRPL = async (id: string) => {
        if (!confirm("Are you sure you want to delete this timing?")) return;
        await deleteRPL(id);
        refresh();
    };

    const handleAddVehicle = async (e: any) => {
        e.preventDefault();
        const name = e.target.name.value;
        if (!name) return;
        await addVehicle(name);
        e.target.reset();
        refresh();
    };

    const handleAddLocation = async (e: any) => {
        e.preventDefault();
        const name = e.target.name.value;
        const category = e.target.category.value;
        const restricted = e.target.restricted.value || undefined;
        if (!name) return;
        await addLocation(name, category, restricted);
        e.target.reset();
        refresh();
    };

    const handleAddRPL = async (e: any) => {
        e.preventDefault();
        const time = e.target.time.value;
        const type = e.target.type.value;
        if (!time) return;
        await addRPLTime(time, type);
        e.target.reset();
        refresh();
    };

    const handleUpdateSetting = async (key: string, val: string) => {
        await updateSystemSetting(key, val);
        refresh();
    };

    const handleInitialize = async () => {
        if (!confirm("This will populate default data (OUV, LCK II, etc.) if missing. Continue?")) return;
        await seedInitialConfig();
        refresh();
    }

    if (isLoading) return <div className="p-8">Loading configuration...</div>;

    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground'
                }`}
        >
            <Icon size={18} /> {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Settings className="text-primary" /> System Configuration
                    </h1>
                    <p className="text-muted-foreground">Manage master data and global settings.</p>
                </div>
                {vehicles.length === 0 && locations.length === 0 && (
                    <button onClick={handleInitialize} className="btn btn-outline gap-2 border-dashed border-primary text-primary hover:bg-primary/10">
                        <RefreshCw size={16} /> Initialize Defaults
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border pb-2">
                <TabButton id="GENERAL" label="General" icon={Settings} />
                <TabButton id="VEHICLES" label="Vehicles" icon={Truck} />
                <TabButton id="LOCATIONS" label="Locations" icon={MapPin} />
                <TabButton id="RPL" label="RPL Schedule" icon={Clock} />
            </div>

            {/* Content */}
            <div className="glass-panel p-6">

                {/* GENERAL SETTINGS */}
                {activeTab === 'GENERAL' && (
                    <div className="space-y-6 max-w-2xl">
                        <div className="form-group">
                            <label className="font-semibold block mb-2">Indent Notice Period (Days)</label>
                            <div className="flex gap-2">
                                <input
                                    className="input"
                                    defaultValue={settings['INDENT_NOTICE_DAYS'] || '10'}
                                    onBlur={(e) => handleUpdateSetting('INDENT_NOTICE_DAYS', e.target.value)}
                                />
                                <div className="text-sm text-muted-foreground self-center">Default: 10</div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="font-semibold block mb-2">System Banner Message</label>
                            <textarea
                                className="input w-full"
                                rows={3}
                                placeholder="e.g. System maintenance on Sunday..."
                                defaultValue={settings['SYSTEM_BANNER'] || ''}
                                onBlur={(e) => handleUpdateSetting('SYSTEM_BANNER', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Leave empty to hide.</p>
                        </div>
                    </div>
                )}

                {/* VEHICLES */}
                {activeTab === 'VEHICLES' && (
                    <div className="space-y-6">
                        <form onSubmit={handleAddVehicle} className="flex gap-2 items-end bg-muted/30 p-4 rounded-lg">
                            <div className="flex-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">New Vehicle Name</label>
                                <input name="name" className="input w-full" placeholder="e.g. Hunter AFV" required />
                            </div>
                            <button className="btn btn-primary"><Plus size={16} /> Add</button>
                        </form>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {vehicles.map(v => (
                                <div key={v.id} className="p-4 rounded-lg border flex justify-between items-center bg-card border-border">
                                    <span className="font-medium">{v.name}</span>
                                    <button
                                        onClick={() => handleDeleteVehicle(v.id)}
                                        className="btn btn-sm btn-ghost text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                        title="Delete Vehicle"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* LOCATIONS */}
                {activeTab === 'LOCATIONS' && (
                    <div className="space-y-6">
                        <form onSubmit={handleAddLocation} className="flex gap-2 items-end bg-muted/30 p-4 rounded-lg">
                            <div className="flex-[2]">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Location Name</label>
                                <input name="name" className="input w-full" placeholder="e.g. Changi Naval Base" required />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Category</label>
                                <select name="category" className="input w-full">
                                    <option value="IN_CAMP">In Camp</option>
                                    <option value="OUT_CAMP">Out Camp</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Restricted Auth (Opt)</label>
                                <input name="restricted" className="input w-full" placeholder="e.g. 160SQN" />
                            </div>
                            <button className="btn btn-primary"><Plus size={16} /> Add</button>
                        </form>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">In Camp</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {locations.filter(l => l.category === 'IN_CAMP').map(l => (
                                    <div key={l.id} className="p-3 rounded border flex justify-between items-center bg-card">
                                        <div>
                                            <div className="font-medium">{l.name}</div>
                                            {l.restrictedAuthority && <div className="text-xs text-orange-500 flex items-center gap-1"><AlertTriangle size={10} /> Restricted: {l.restrictedAuthority}</div>}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteLocation(l.id)}
                                            className="btn btn-sm btn-ghost text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                            title="Delete Location"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <h3 className="font-semibold text-lg border-b pb-2 mt-6">Out Camp</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {locations.filter(l => l.category === 'OUT_CAMP').map(l => (
                                    <div key={l.id} className="p-3 rounded border flex justify-between items-center bg-card">
                                        <div>
                                            <div className="font-medium">{l.name}</div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteLocation(l.id)}
                                            className="btn btn-sm btn-ghost text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                            title="Delete Location"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* RPL */}
                {activeTab === 'RPL' && (
                    <div className="space-y-6">
                        <form onSubmit={handleAddRPL} className="flex gap-2 items-end bg-muted/30 p-4 rounded-lg">
                            <div className="flex-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Timing</label>
                                <input name="time" className="input w-full" placeholder="e.g. 11:59pm" required />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Type</label>
                                <select name="type" className="input w-full">
                                    <option value="ARRIVE">Arriving ME</option>
                                    <option value="DEPART">Departing ME</option>
                                </select>
                            </div>
                            <button className="btn btn-primary"><Plus size={16} /> Add</button>
                        </form>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-semibold mb-3">Arriving ME</h3>
                                <div className="space-y-2">
                                    {rpl.filter(r => r.type === 'ARRIVE').map(r => (
                                        <div key={r.id} className="flex justify-between items-center p-3 border rounded bg-card">
                                            <span className="font-mono">{r.time}</span>
                                            <button
                                                onClick={() => handleDeleteRPL(r.id)}
                                                className="btn btn-sm btn-ghost text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                                title="Delete Timing"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-3">Departing ME</h3>
                                <div className="space-y-2">
                                    {rpl.filter(r => r.type === 'DEPART').map(r => (
                                        <div key={r.id} className="flex justify-between items-center p-3 border rounded bg-card">
                                            <span className="font-mono">{r.time}</span>
                                            <button
                                                onClick={() => handleDeleteRPL(r.id)}
                                                className="btn btn-sm btn-ghost text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                                title="Delete Timing"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
