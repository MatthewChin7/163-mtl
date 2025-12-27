'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Indent, VehicleType, UserRole, LocationCategory, InCampLocation, OutCampLocation, Waypoint } from '@/types';
import { auth } from '@/lib/auth';
import { db } from '@/lib/store';
import { ArrowLeft, ArrowRight, Save, AlertTriangle, Plus, Trash2 } from 'lucide-react';

interface IndentFormProps {
    initialData?: Indent;
    isEditing?: boolean;
}

export default function IndentForm({ initialData, isEditing = false }: IndentFormProps) {
    const router = useRouter();
    const user = auth.getCurrentUser();

    const [formData, setFormData] = useState<Partial<Indent>>(initialData || {
        vehicleType: 'OUV',
        typeOfIndent: 'NORMAL_MTC',
        vehicleCommanderName: 'TBC',
        startLocationCategory: 'IN_CAMP',
        startLocation: 'LCK II',
        endLocationCategory: 'OUT_CAMP',
        endLocation: 'ME',
        purpose: '',
        reason: '',
    });

    // Auto-populate In-Camp TO Logic & Location Restrictions
    useEffect(() => {
        if (formData.typeOfIndent === 'INCAMP_TO') {
            // Restriction: Must be IN_CAMP
            if (formData.startLocationCategory !== 'IN_CAMP') setFormData(prev => ({ ...prev, startLocationCategory: 'IN_CAMP', startLocation: 'LCK II' }));
            if (formData.endLocationCategory !== 'IN_CAMP') setFormData(prev => ({ ...prev, endLocationCategory: 'IN_CAMP', endLocation: 'LCK II' }));

            if (formData.startTime) {
                const dateStr = new Date(formData.startTime).toISOString().split('T')[0];
                const duty = db.dailyDuties.getByDate(dateStr);
                if (duty) {
                    setFormData(prev => ({ ...prev, transportOperator: duty.rankName }));
                } else {
                    setFormData(prev => ({ ...prev, transportOperator: 'Pending MTC Assignment' }));
                }
            }
        } else if (formData.typeOfIndent !== 'SELF_DRIVE') {
            // For Normal/Adhoc/Monthly, clear TO (MTC assigns)
            if (!isEditing) {
                setFormData(prev => ({ ...prev, transportOperator: undefined }));
            }
        }
    }, [formData.typeOfIndent, formData.startTime, formData.startLocationCategory, formData.endLocationCategory, isEditing]);

    const getIndentDescription = (type: string) => {
        switch (type) {
            case 'NORMAL_MTC': return "MT Indents that require MTC support for TO. Requests must be made >10 days before.";
            case 'ADHOC_MTC': return "MT Indents that require MTC support for TO. Requests <10 days before. Must provide reason.";
            case 'SELF_DRIVE': return "Transport Operator must be a qualified Dual Vocationalist (DV).";
            case 'INCAMP_TO': return "In camp movements supported by daily In-camp TO. (Restricted to In-Camp locations)";
            case 'MONTHLY': return "Bulk indents to be made before the 10th of the preceding month.";
            default: return "";
        }
    };

    const [error, setError] = useState<string | null>(null);

    // Helper for notification logic
    // RPL Logic: ONLY show if ONE location is 'ME' (XOR)
    const startIsME = formData.startLocation === 'ME';
    const endIsME = formData.endLocation === 'ME';
    const showRPLInput = (startIsME || endIsME) && !(startIsME && endIsME);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.startTime || !formData.endTime) {
            setError("Start and End times are required");
            return;
        }
        if (new Date(formData.endTime) <= new Date(formData.startTime)) {
            setError("End time must be after start time");
            return;
        }
        if (!formData.endLocation || !formData.purpose) {
            setError("Please fill in all required fields");
            return;
        }

        // Logic Check: Parking
        if (['MT Park 1', 'MT Park 2'].includes(formData.startLocation || '') && !formData.parkingLotNumber) {
            setError("Parking Lot Number is required for MT Park. If not required, input N/A");
            return;
        }

        // Logic Check: RPL Validation with Waypoints
        const startME = formData.startLocation === 'ME';
        const endME = formData.endLocation === 'ME';
        const waypointHasME = (formData.waypoints || []).some(wp => wp.location === 'ME');
        const showDepartRPL = startME || waypointHasME;
        const showArriveRPL = endME || waypointHasME;

        if (showDepartRPL && !formData.rplTimingDepart) {
            setError("RPL Timing (Departing ME) is required.");
            return;
        }
        if (showArriveRPL && !formData.rplTimingArrive) {
            setError("RPL Timing (Arriving ME) is required.");
            return;
        }

        // Logic Check: Self Drive TO
        if (formData.typeOfIndent === 'SELF_DRIVE' && !formData.transportOperator) {
            setError("Transport Operator Name (DV) is required for Self Drive.");
            return;
        }

        // Serial Generation (Mock)
        const serial = `${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const newIndent: Indent = {
            id: crypto.randomUUID(),
            serialNumber: serial,
            requestorId: user?.id || 'unknown',
            createdAt: new Date().toISOString(),
            status: 'PENDING_AS3', // Initial State
            approvalLogs: [],

            // Cast the partial to full type after validation
            vehicleType: formData.vehicleType as VehicleType,
            vehicleTypeOther: formData.vehicleTypeOther,
            vehicleNumber: formData.vehicleNumber,

            startTime: formData.startTime,
            endTime: formData.endTime,

            startLocationCategory: formData.startLocationCategory as LocationCategory,
            startLocation: formData.startLocation!,
            startLocationOther: formData.startLocationOther,

            endLocationCategory: formData.endLocationCategory as LocationCategory,
            endLocation: formData.endLocation!,
            endLocationOther: formData.endLocationOther,

            parkingLotNumber: formData.parkingLotNumber,
            rplTiming: formData.rplTiming,

            purpose: formData.purpose!,
            typeOfIndent: formData.typeOfIndent as any,
            vehicleCommanderName: formData.vehicleCommanderName!,
            transportOperator: formData.transportOperator,
            reason: formData.reason!,
            specialInstructions: formData.specialInstructions,

            // New Fields for Clean Type
            approverSkipList: [],
            editorRoleId: undefined
        };

        if (isEditing && initialData) {
            // Re-approval Logic
            let newStatus = initialData.status;

            if (user?.role === 'REQUESTOR') {
                // Check if only vehicleCommanderName changed
                const significantChanges = (
                    formData.startTime !== initialData.startTime ||
                    formData.endTime !== initialData.endTime ||
                    formData.startLocation !== initialData.startLocation ||
                    formData.endLocation !== initialData.endLocation ||
                    formData.vehicleType !== initialData.vehicleType ||
                    formData.purpose !== initialData.purpose ||
                    formData.typeOfIndent !== initialData.typeOfIndent ||
                    formData.rplTiming !== initialData.rplTiming ||
                    formData.parkingLotNumber !== initialData.parkingLotNumber
                );

                if (significantChanges) {
                    newStatus = 'PENDING_AS3'; // Reset workflow
                }
            }

            // Update Flow
            db.indents.update(initialData.id, {
                ...newIndent,
                id: initialData.id,
                serialNumber: initialData.serialNumber,
                createdAt: initialData.createdAt,
                status: newStatus,
                approvalLogs: newStatus === 'PENDING_AS3' ? [] : initialData.approvalLogs, // Clear logs if reset
                editorRoleId: user?.role
            });
        } else {
            // Create Flow
            db.indents.add(newIndent);
        }

        // Redirect
        router.push('/dashboard');
    };

    const handleChange = (field: keyof Indent, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Helper for notification logic
    const show160SQNAlert = ['Tarmac', 'H20'].includes(formData.startLocation || '') || ['Tarmac', 'H20'].includes(formData.endLocation || '');
    const showParkingInput = ['MT Park 1', 'MT Park 2'].includes(formData.startLocation || '');

    return (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{isEditing ? 'Edit Indent' : 'Create New Indent'}</h2>
                <p style={{ color: 'var(--fg-secondary)' }}>{isEditing ? `Modifying Serial #${initialData?.serialNumber}` : 'Fill in the details for transport movement.'}</p>
            </div>

            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ⚠️ {error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Row 1 */}
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Indent Type</label>
                    <select
                        className="input"
                        value={formData.typeOfIndent}
                        onChange={(e) => handleChange('typeOfIndent', e.target.value)}
                    >
                        <option value="NORMAL_MTC">Normal (MTC Support)</option>
                        <option value="ADHOC_MTC">Ad hoc (MTC Support)</option>
                        <option value="SELF_DRIVE">Self Drive</option>
                        <option value="INCAMP_TO">In-Camp TO</option>
                        <option value="MONTHLY">Monthly</option>
                    </select>
                    <div style={{ fontSize: '0.875rem', color: 'var(--fg-secondary)', marginTop: '0.5rem', background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                        ℹ️ {getIndentDescription(formData.typeOfIndent || '')}
                    </div>
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Vehicle Type</label>
                    <select
                        className="input"
                        value={formData.vehicleType}
                        onChange={(e) => handleChange('vehicleType', e.target.value)}
                    >
                        {['OUV', 'S/OUV', 'LUV', '8x8 (MSV)', '8x8 (LM)', '8x8 (DLS)', '8x8 (MWEC)', '6x6 (TCP)', '6TON GS', '5TON SKIDTANKER', 'GP CAR', 'MINIBUS', 'OTHER'].map(v => (
                            <option key={v} value={v}>{v}</option>
                        ))}
                    </select>
                    {formData.vehicleType === 'OTHER' && (
                        <input
                            type="text"
                            className="input"
                            placeholder="Specify Vehicle"
                            style={{ marginTop: '0.5rem' }}
                            onChange={(e) => handleChange('vehicleTypeOther', e.target.value)}
                        />
                    )}
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Vehicle Number (Optional)</label>
                    <input
                        type="text"
                        className="input"
                        value={formData.vehicleNumber || ''}
                        onChange={(e) => handleChange('vehicleNumber', e.target.value)}
                        placeholder="e.g. 123456"
                    />
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Equipment Number (Optional)</label>
                    <input
                        type="text"
                        className="input"
                        onChange={(e) => handleChange('equipmentNumber' as keyof Indent, e.target.value)}
                    />
                </div>

                {/* Transport Operator Input Logic */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Transport Operator</label>
                    <input
                        type="text"
                        className={`input ${formData.typeOfIndent !== 'SELF_DRIVE' ? 'bg-gray-100' : ''}`}
                        placeholder={formData.typeOfIndent === 'SELF_DRIVE' ? "Enter DV Name" : "Assigned by MTC"}
                        value={formData.transportOperator || ''}
                        onChange={(e) => handleChange('transportOperator', e.target.value)}
                        disabled={formData.typeOfIndent !== 'SELF_DRIVE'} // Disabled for everyone except Self Drive
                    />
                    {formData.typeOfIndent === 'INCAMP_TO' && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', marginTop: '0.25rem' }}>
                            Auto-assigned from Daily Schedule based on date.
                        </div>
                    )}
                </div>

                {/* Row 2: Timing */}
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Start Time</label>
                    <input
                        type="datetime-local"
                        className="input"
                        required
                        onChange={(e) => handleChange('startTime', e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>End Time</label>
                    <input
                        type="datetime-local"
                        className="input"
                        required
                        onChange={(e) => handleChange('endTime', e.target.value)}
                    />
                </div>

                {/* Row 3: Location */}
                {/* Row 3: Location - Nested Logic */}
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Start Location</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <button
                            type="button"
                            className={`btn ${formData.startLocationCategory === 'IN_CAMP' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => {
                                handleChange('startLocationCategory', 'IN_CAMP');
                                handleChange('startLocation', 'LCK II');
                            }}
                            style={{ flex: 1, padding: '0.5rem' }}
                        >In Camp</button>
                        <button
                            type="button"
                            className={`btn ${formData.startLocationCategory === 'OUT_CAMP' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => {
                                handleChange('startLocationCategory', 'OUT_CAMP');
                                handleChange('startLocation', 'ME');
                            }}
                            disabled={formData.typeOfIndent === 'INCAMP_TO'}
                            style={{ flex: 1, padding: '0.5rem', opacity: formData.typeOfIndent === 'INCAMP_TO' ? 0.3 : 1, cursor: formData.typeOfIndent === 'INCAMP_TO' ? 'not-allowed' : 'pointer' }}
                        >Out Camp</button>
                    </div>

                    {formData.startLocationCategory === 'IN_CAMP' ? (
                        <select className="input" value={formData.startLocation} onChange={(e) => handleChange('startLocation', e.target.value)}>
                            {['LCK II', 'Tarmac', 'MT Park 1', 'MT Park 2', 'H20', 'OTHER'].map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    ) : (
                        <select className="input" value={formData.startLocation} onChange={(e) => handleChange('startLocation', e.target.value)}>
                            {['ME', 'JC', 'OTHER'].map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    )}

                    {formData.startLocation === 'OTHER' && (
                        <input className="input" style={{ marginTop: '0.5rem' }} placeholder="Specify Location" onChange={(e) => handleChange('startLocationOther', e.target.value)} />
                    )}
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>End Location</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <button
                            type="button"
                            className={`btn ${formData.endLocationCategory === 'IN_CAMP' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => {
                                handleChange('endLocationCategory', 'IN_CAMP');
                                handleChange('endLocation', 'LCK II');
                            }}
                            style={{ flex: 1, padding: '0.5rem' }}
                        >In Camp</button>
                        <button
                            type="button"
                            className={`btn ${formData.endLocationCategory === 'OUT_CAMP' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => {
                                handleChange('endLocationCategory', 'OUT_CAMP');
                                handleChange('endLocation', 'ME');
                            }}
                            disabled={formData.typeOfIndent === 'INCAMP_TO'}
                            style={{ flex: 1, padding: '0.5rem', opacity: formData.typeOfIndent === 'INCAMP_TO' ? 0.3 : 1, cursor: formData.typeOfIndent === 'INCAMP_TO' ? 'not-allowed' : 'pointer' }}
                        >Out Camp</button>
                    </div>

                    {formData.endLocationCategory === 'IN_CAMP' ? (
                        <select className="input" value={formData.endLocation} onChange={(e) => handleChange('endLocation', e.target.value)}>
                            {['LCK II', 'Tarmac', 'MT Park 1', 'MT Park 2', 'H20', 'OTHER'].map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    ) : (
                        <select className="input" value={formData.endLocation} onChange={(e) => handleChange('endLocation', e.target.value)}>
                            {['ME', 'JC', 'OTHER'].map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    )}

                    {formData.endLocation === 'OTHER' && (
                        <input className="input" style={{ marginTop: '0.5rem' }} placeholder="Specify Location" onChange={(e) => handleChange('endLocationOther', e.target.value)} />
                    )}
                </div>

                {/* Conditional Alerts & Inputs */}
                {show160SQNAlert && (
                    <div style={{ gridColumn: 'span 2', background: '#3b82f620', color: '#60a5fa', padding: '0.75rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <AlertTriangle size={16} />
                        <span>Note: This movement involves Tarmac/H20. <strong>"Clear with 160SQN"</strong> notification will be sent to AS3.</span>
                    </div>
                )}

                {showParkingInput && (
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Parking Lot Numbers (Required)</label>
                        <input
                            className="input"
                            placeholder="e.g. Lots 15-20"
                            required
                            onChange={(e) => handleChange('parkingLotNumber', e.target.value)}
                        />
                        <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', marginTop: '0.25rem' }}>Use "163SQN requesting for parking lot numbers" format notification to MTC.</div>
                    </div>
                )}

                {/* Waypoints Section */}
                <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Route / Waypoints (Optional)</label>
                    {/* Waypoint List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                        {(formData.waypoints || []).map((wp, index) => (
                            <div key={index} className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <strong>Waypoint {index + 1}</strong>
                                    <button type="button" onClick={() => {
                                        const newWp = [...(formData.waypoints || [])];
                                        newWp.splice(index, 1);
                                        handleChange('waypoints', newWp);
                                    }} style={{ color: 'var(--status-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <button
                                        type="button"
                                        className={`btn ${wp.locationCategory === 'IN_CAMP' ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => {
                                            const newWp = [...(formData.waypoints || [])];
                                            newWp[index] = { ...newWp[index], locationCategory: 'IN_CAMP', location: 'LCK II' };
                                            handleChange('waypoints', newWp);
                                        }}
                                        style={{ flex: 1, padding: '0.25rem' }}
                                    >In Camp</button>
                                    <button
                                        type="button"
                                        className={`btn ${wp.locationCategory === 'OUT_CAMP' ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => {
                                            const newWp = [...(formData.waypoints || [])];
                                            newWp[index] = { ...newWp[index], locationCategory: 'OUT_CAMP', location: 'ME' };
                                            handleChange('waypoints', newWp);
                                        }}
                                        disabled={formData.typeOfIndent === 'INCAMP_TO'}
                                        style={{ flex: 1, padding: '0.25rem', opacity: formData.typeOfIndent === 'INCAMP_TO' ? 0.3 : 1 }}
                                    >Out Camp</button>
                                </div>
                                {wp.locationCategory === 'IN_CAMP' ? (
                                    <select
                                        className="input"
                                        value={wp.location}
                                        onChange={(e) => {
                                            const newWp = [...(formData.waypoints || [])];
                                            newWp[index] = { ...newWp[index], location: e.target.value };
                                            handleChange('waypoints', newWp);
                                        }}
                                    >
                                        {['LCK II', 'Tarmac', 'MT Park 1', 'MT Park 2', 'H20', 'OTHER'].map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                ) : (
                                    <select
                                        className="input"
                                        value={wp.location}
                                        onChange={(e) => {
                                            const newWp = [...(formData.waypoints || [])];
                                            newWp[index] = { ...newWp[index], location: e.target.value };
                                            handleChange('waypoints', newWp);
                                        }}
                                    >
                                        {['ME', 'JC', 'OTHER'].map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                )}
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => handleChange('waypoints', [...(formData.waypoints || []), { locationCategory: 'IN_CAMP', location: 'LCK II' }])}
                        className="btn btn-ghost"
                        style={{ border: '1px dashed var(--border-subtle)', width: '100%', padding: '0.75rem' }}
                    >
                        + Add Intermediate Location
                    </button>
                </div>

                {/* RPL Timings */}
                {(() => {
                    const startME = formData.startLocation === 'ME';
                    const endME = formData.endLocation === 'ME';
                    const waypointHasME = (formData.waypoints || []).some(wp => wp.location === 'ME');

                    // Show "Departing ME" if I start at ME OR pass through ME (implying I leave it)
                    // Logic refinement: We need DEPART RPL if Start=ME OR Waypoint=ME
                    const showDepartRPL = startME || waypointHasME;

                    // Show "Arriving ME" if End=ME OR Waypoint=ME
                    const showArriveRPL = endME || waypointHasME;

                    // Exclude internal ME-ME? User said: "ME to ME: RPL Input Does NOT Show".
                    // If Start=ME and End=ME and No Waypoints -> No RPL.
                    // If Start=ME and Waypoint=LCK and End=ME -> Valid.
                    // Simple XOR check is tricky with waypoints.
                    // Let's implement individual checks. 

                    return (
                        <div style={{ gridColumn: 'span 2', display: 'grid', gap: '1rem' }}>
                            {showArriveRPL && (
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>RPL Timing (Arriving ME)</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                                        <select
                                            className="input"
                                            value={['11:45am', '3:30pm'].includes(formData.rplTimingArrive || '') ? formData.rplTimingArrive : ((formData.rplTimingArrive) ? 'OTHER' : '')}
                                            onChange={(e) => {
                                                if (e.target.value === 'OTHER') handleChange('rplTimingArrive', ' ');
                                                else handleChange('rplTimingArrive', e.target.value);
                                            }}
                                        >
                                            <option value="" disabled>Select Arrive Timing</option>
                                            {['11:45am', '3:30pm'].map(o => <option key={o} value={o}>{o}</option>)}
                                            <option value="OTHER">Other</option>
                                        </select>
                                        {(formData.rplTimingArrive && !['11:45am', '3:30pm'].includes(formData.rplTimingArrive)) && (
                                            <input className="input" placeholder="Specify Arrive Timing" value={formData.rplTimingArrive.trim()} onChange={e => handleChange('rplTimingArrive', e.target.value)} />
                                        )}
                                    </div>
                                </div>
                            )}

                            {showDepartRPL && (
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>RPL Timing (Departing ME)</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                                        <select
                                            className="input"
                                            value={['12:30pm', '4:30pm'].includes(formData.rplTimingDepart || '') ? formData.rplTimingDepart : ((formData.rplTimingDepart) ? 'OTHER' : '')}
                                            onChange={(e) => {
                                                if (e.target.value === 'OTHER') handleChange('rplTimingDepart', ' ');
                                                else handleChange('rplTimingDepart', e.target.value);
                                            }}
                                        >
                                            <option value="" disabled>Select Depart Timing</option>
                                            {['12:30pm', '4:30pm'].map(o => <option key={o} value={o}>{o}</option>)}
                                            <option value="OTHER">Other</option>
                                        </select>
                                        {(formData.rplTimingDepart && !['12:30pm', '4:30pm'].includes(formData.rplTimingDepart)) && (
                                            <input className="input" placeholder="Specify Depart Timing" value={formData.rplTimingDepart.trim()} onChange={e => handleChange('rplTimingDepart', e.target.value)} />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Row 4: Details */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Purpose of Movement</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="e.g. Training Support for Exercise X"
                        onChange={(e) => handleChange('purpose', e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Vehicle Commander</label>
                    <input
                        type="text"
                        className="input"
                        value={formData.vehicleCommanderName}
                        onChange={(e) => handleChange('vehicleCommanderName', e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Justification / Reason</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Why is transport needed?"
                        onChange={(e) => handleChange('reason', e.target.value)}
                    />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Special Instructions</label>
                    <textarea
                        className="input"
                        rows={3}
                        onChange={(e) => handleChange('specialInstructions', e.target.value)}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                    <Save size={18} /> {isEditing ? 'Save Changes' : 'Submit Indent'}
                </button>
            </div>
        </form>
    );
}
