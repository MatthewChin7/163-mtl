import { Indent, VehicleType, UserRole } from '@/types';
import { X, MapPin, Calendar, User, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface IndentDetailsModalProps {
    indent: Indent;
    onClose: () => void;
}

export default function IndentDetailsModal({ indent, onClose }: IndentDetailsModalProps) {
    if (!indent) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '0', position: 'relative', background: '#fff' }}>
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Indent #{indent.serialNumber} Details</h2>
                        <span className={`status-badge status-${indent.status.toLowerCase()}`}>{indent.status.replace('_', ' ')}</span>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.5rem' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '2rem' }}>
                    {/* Key Info Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                        <div>
                            <h3 className="section-title"><User size={16} /> Requestor</h3>
                            <div className="detail-row">
                                <label>Name</label>
                                <span>{(indent.requestor as any)?.rank} {(indent.requestor as any)?.name}</span>
                            </div>
                            <div className="detail-row">
                                <label>Unit</label>
                                <span>{(indent.requestor as any)?.unit}</span>
                            </div>
                            <div className="detail-row">
                                <label>Created</label>
                                <span>{format(new Date(indent.createdAt), 'dd MMM yyyy HH:mm')}</span>
                            </div>
                        </div>

                        <div>
                            <h3 className="section-title"><FileText size={16} /> Vehicle & Operator</h3>
                            <div className="detail-row">
                                <label>Vehicle Type</label>
                                <span>{indent.vehicleType === 'OTHER' ? indent.vehicleTypeOther : indent.vehicleType}</span>
                            </div>
                            <div className="detail-row">
                                <label>Veh No.</label>
                                <span>{indent.vehicleNumber || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <label>TO Name</label>
                                <span>{indent.transportOperator || 'Pending Assignment'}</span>
                            </div>
                            <div className="detail-row">
                                <label>Veh Comd</label>
                                <span>{indent.vehicleCommanderName}</span>
                            </div>
                        </div>
                    </div>

                    {/* Timing & Location */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 className="section-title"><Calendar size={16} /> Timing</h3>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--fg-secondary)', marginBottom: '0.25rem' }}>Start</label>
                                <div style={{ fontWeight: 600 }}>{format(new Date(indent.startTime), 'dd MMM yyyy, HH:mm')}</div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--fg-secondary)', marginBottom: '0.25rem' }}>End</label>
                                <div style={{ fontWeight: 600 }}>{format(new Date(indent.endTime), 'dd MMM yyyy, HH:mm')}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h3 className="section-title"><MapPin size={16} /> Route</h3>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div className="location-pill">
                                <span className="label">Start</span>
                                {indent.startLocation === 'OTHER' ? indent.startLocationOther : indent.startLocation}
                            </div>
                            <span style={{ color: 'var(--fg-secondary)' }}>➔</span>

                            {(indent.waypoints as any[])?.map((wp, i) => (
                                <div key={i} style={{ display: 'contents' }}>
                                    <div className="location-pill waypt">
                                        <span className="label">WP {i + 1}</span>
                                        {wp.location === 'OTHER' ? wp.locationOther : wp.location}
                                    </div>
                                    <span style={{ color: 'var(--fg-secondary)' }}>➔</span>
                                </div>
                            ))}

                            <div className="location-pill">
                                <span className="label">End</span>
                                {indent.endLocation === 'OTHER' ? indent.endLocationOther : indent.endLocation}
                            </div>
                        </div>
                    </div>

                    {/* Purpose & Remarks */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 className="section-title">Purpose & Remarks</h3>
                        <p style={{ marginBottom: '1rem' }}><strong>Purpose:</strong> {indent.purpose}</p>
                        <p style={{ marginBottom: '1rem' }}><strong>Reason:</strong> {indent.reason || '-'}</p>
                        <p><strong>Instructions:</strong> {indent.specialInstructions || '-'}</p>
                    </div>

                    {/* RPL */}
                    {(indent.rplTimingDepart || indent.rplTimingArrive || indent.parkingLotNumber) && (
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                            <h3 className="section-title" style={{ marginTop: 0 }}>Additional Info</h3>
                            {indent.rplTimingDepart && <div><strong>RPL Depart ME:</strong> {indent.rplTimingDepart}</div>}
                            {indent.rplTimingArrive && <div><strong>RPL Arrive ME:</strong> {indent.rplTimingArrive}</div>}
                            {indent.parkingLotNumber && <div><strong>Parking Lot:</strong> {indent.parkingLotNumber}</div>}
                        </div>
                    )}
                </div>

                <style jsx>{`
                    .section-title {
                        font-size: 0.875rem;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: var(--fg-secondary);
                        border-bottom: 2px solid var(--border-subtle);
                        padding-bottom: 0.5rem;
                        margin-bottom: 1rem;
                        display: flex;
                        gap: 0.5rem;
                        align-items: center;
                    }
                    .detail-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 0.5rem;
                        border-bottom: 1px dashed var(--border-subtle);
                        padding-bottom: 0.25rem;
                    }
                    .detail-row label {
                        color: var(--fg-secondary);
                        font-size: 0.875rem;
                    }
                    .detail-row span {
                        font-weight: 500;
                        text-align: right;
                    }
                    .location-pill {
                        background: var(--bg-surface);
                        border: 1px solid var(--border-subtle);
                        padding: 0.5rem 1rem;
                        border-radius: 99px;
                        font-weight: 500;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        min-width: 80px;
                    }
                    .location-pill.waypt {
                        background: #f1f5f9;
                    }
                    .location-pill .label {
                        font-size: 0.65rem;
                        text-transform: uppercase;
                        color: var(--fg-secondary);
                        margin-bottom: 0.1rem;
                    }
                `}</style>
            </div>
        </div>
    );
}
