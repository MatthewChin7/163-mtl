export type UserRole = 'ADMIN' | 'REQUESTOR' | 'APPROVER_AS3' | 'APPROVER_S3' | 'APPROVER_MTC';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    rank?: string;
    unit?: string;
    status: 'ACTIVE' | 'PENDING' | 'REJECTED';
    password?: string; // For mock auth
}

export type IndentStatus =
    | 'DRAFT'
    | 'PENDING_REQUESTOR' // New: for when approver edits
    | 'PENDING_AS3'
    | 'PENDING_S3'
    | 'PENDING_MTC'
    | 'APPROVED'
    | 'REJECTED'
    | 'CANCELLED';

export type VehicleType =
    | 'OUV'
    | 'S/OUV'
    | 'LUV'
    | '8x8 (MSV)'
    | '8x8 (LM)'
    | '8x8 (DLS)'
    | '8x8 (MWEC)'
    | '6x6 (TCP)'
    | '6TON GS'
    | '5TON SKIDTANKER'
    | 'GP CAR'
    | 'MINIBUS'
    | 'OTHER';

export type LocationCategory = 'IN_CAMP' | 'OUT_CAMP';

export type InCampLocation =
    | 'LCK II'
    | 'Tarmac'
    | 'MT Park 1'
    | 'MT Park 2'
    | 'H20'
    | 'OTHER';

export type OutCampLocation =
    | 'ME'
    | 'JC'
    | 'OTHER';

export interface Waypoint {
    locationCategory: LocationCategory;
    location: string;
    locationOther?: string;
}

export interface ApprovalLog {
    stage: UserRole;
    status: 'APPROVED' | 'REJECTED';
    timestamp: string;
    approverId: string;
    approverName: string;
    reason?: string;
}

export interface Indent {
    id: string;
    serialNumber: number;
    requestorId: string;
    createdAt: string;
    status: IndentStatus;

    // Approval Flow & Rejection
    approvalLogs: ApprovalLog[];
    cancellationReason?: string;
    editorRole?: UserRole; // Track who made the last edit (for re-approval loops)
    approverSkipList?: UserRole[]; // Roles that have already approved and should be skipped in re-approval

    // Core Data
    vehicleType: string; // Dynamic via Config
    vehicleTypeOther: string | null;
    vehicleNumber?: string;
    equipmentNumber?: string;

    startTime: string;
    endTime: string;

    startLocationCategory: LocationCategory;
    startLocation: string;
    startLocationOther?: string;

    // Waypoints (Intermediate Locations)
    waypoints?: Waypoint[];

    endLocationCategory: LocationCategory;
    endLocation: string;
    endLocationOther?: string;

    parkingLotNumber?: string;

    // RPL Timings
    rplTiming?: string; // Kept for legacy/simple compatibility or main timing
    rplTimingDepart?: string; // For departing ME
    rplTimingArrive?: string; // For arriving ME

    purpose: string;
    typeOfIndent: 'MTC_SUPPORT' | 'SELF_DRIVE' | 'INCAMP_TO' | 'NORMAL_BULK' | 'MONTHLY' | 'NORMAL_MTC' | 'ADHOC_MTC';
    vehicleCommanderName: string;
    transportOperator?: string; // Optional until assigned
    reason?: string;
    specialInstructions?: string;
    previousStatus?: IndentStatus; // To restore context if needed

    // Relations (Populated via include: { ... })
    requestor?: User;
}

export interface RoleRequest {
    id: string;
    userId: string;
    userName: string;
    currentRole: UserRole;
    requestedRole: UserRole;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
}

export interface DailyDutyDO {
    date: string; // ISO Date "yyyy-mm-dd"
    rankName: string; // e.g. "LCP Tan"
}
// ... existing types


