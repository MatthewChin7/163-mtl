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
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    background: indent.status === 'REJECTED' ? '#000000' : '#ffffff',
                    color: indent.status === 'REJECTED' ? '#ffffff' : '#000000'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Indent #{indent.serialNumber} Details</h2>
                        <span className={`status-badge status-${indent.status.toLowerCase()}`} style={{ border: indent.status === 'REJECTED' ? '1px solid white' : 'none' }}>
                            {indent.status.replace('_', ' ')}
                        </span>
                        {indent.status === 'REJECTED' && <span style={{ marginLeft: '1rem', fontWeight: 700, color: '#ef4444' }}>REJECTED</span>}
                    </div>
                    <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.5rem', color: indent.status === 'REJECTED' ? 'white' : 'inherit' }}>
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
                                <span>{indent.requestor?.rank} {indent.requestor?.name}</span>
                            </div>
                            <div className="detail-row">
                                <label>Unit</label>
                                <span>{indent.requestor?.unit || '-'}</span>
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
                                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: '#000000', fontWeight: 'bold' }}>Start</label>
                                <div style={{ fontWeight: 600, color: '#000000' }}>{format(new Date(indent.startTime), 'dd MMM yyyy, HH:mm')}</div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: '#000000', fontWeight: 'bold' }}>End</label>
                                <div style={{ fontWeight: 600, color: '#000000' }}>{format(new Date(indent.endTime), 'dd MMM yyyy, HH:mm')}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h3 className="section-title"><MapPin size={16} /> Route</h3>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div className="location-pill">
                                <span className="label" style={{ color: '#000000', fontWeight: 'bold' }}>Start</span>
                                {indent.startLocation === 'OTHER' ? indent.startLocationOther : indent.startLocation}
                            </div>
                            <span style={{ color: '#000000', fontWeight: 'bold' }}>➔</span>

                            {(indent.waypoints as any[])?.map((wp, i) => (
                                <div key={i} style={{ display: 'contents' }}>
                                    <div className="location-pill waypt">
                                        <span className="label" style={{ color: '#000000', fontWeight: 'bold' }}>WP {i + 1}</span>
                                        {wp.location === 'OTHER' ? wp.locationOther : wp.location}
                                    </div>
                                    <span style={{ color: '#000000', fontWeight: 'bold' }}>➔</span>
                                </div>
                            ))}

                            <div className="location-pill">
                                <span className="label" style={{ color: '#000000', fontWeight: 'bold' }}>End</span>
                                {indent.endLocation === 'OTHER' ? indent.endLocationOther : indent.endLocation}
                            </div>
                        </div>
                    </div>

                    {/* Purpose & Remarks */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 className="section-title">Purpose & Remarks</h3>
                        <p style={{ marginBottom: '1rem', color: '#000000' }}><strong>Purpose:</strong> {indent.purpose}</p>
                        <p style={{ marginBottom: '1rem', color: '#000000' }}><strong>Reason:</strong> {indent.reason || '-'}</p>
                        <p style={{ color: '#000000' }}><strong>Instructions:</strong> {indent.specialInstructions || '-'}</p>
                    </div>

                    {/* RPL */}
                    {(indent.rplTimingDepart || indent.rplTimingArrive || indent.parkingLotNumber) && (
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                            <h3 className="section-title" style={{ marginTop: 0 }}>Additional Info</h3>
                            {indent.rplTimingDepart && <div style={{ color: '#000000' }}><strong>RPL Depart ME:</strong> {indent.rplTimingDepart}</div>}
                            {indent.rplTimingArrive && <div style={{ color: '#000000' }}><strong>RPL Arrive ME:</strong> {indent.rplTimingArrive}</div>}
                            {indent.parkingLotNumber && <div style={{ color: '#000000' }}><strong>Parking Lot:</strong> {indent.parkingLotNumber}</div>}
                        </div>
                    )}
                </div>

                <style jsx>{`
                    .section-title {
                        font-size: 0.875rem;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #000000;
                        border-bottom: 2px solid #e5e7eb;
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
                        border-bottom: 1px dashed #e5e7eb;
                        padding-bottom: 0.25rem;
                    }
                    .detail-row label {
                        color: #000000;
                        font-size: 0.875rem;
                        font-weight: 600; /* Bolder label for readability */
                    }
                    .detail-row span {
                        font-weight: 600;
                        text-align: right;
                        color: #000000;
                    }
                    .location-pill {
                        background: #f3f4f6;
                        border: 1px solid #d1d5db;
                        padding: 0.5rem 1rem;
                        border-radius: 99px;
                        font-weight: 600;
                        color: #000000;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        min-width: 80px;
                    }
                    .location-pill.waypt {
                        background: #e5e7eb;
                    }
                    .location-pill .label {
                        font-size: 0.65rem;
                        text-transform: uppercase;
                        color: #000000;
                        margin-bottom: 0.1rem;
                        font-weight: 700;
                    }
                    p, strong {
                        color: #000000;
                    }
                    /* Ensure headers in content are black */
                    h3 { color: #000000; }
                `}</style>
            </div>
        </div>
    );
}
