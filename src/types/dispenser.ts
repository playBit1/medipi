// src/types/dispenser.ts

export enum DispenserStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR',
  OFFLINE_AUTONOMOUS = 'OFFLINE_AUTONOMOUS',
}

export enum RfidType {
  PATIENT = 'PATIENT',
  ADMIN = 'ADMIN',
}

export enum DispensingStatus {
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  LATE = 'LATE',
  ERROR = 'ERROR',
}

export type Dispenser = {
  id: string;
  serialNumber: string;
  status: DispenserStatus;
  lastSeen: Date | string | null;
  patientId: string | null;
  lastSyncedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type DispenserWithPatient = Dispenser & {
  patient: {
    id: string;
    name: string;
  } | null;
};

export type Chamber = {
  id: string;
  dispenserId: string;
  chamberNumber: number;
};

export type Schedule = {
  id: string;
  time: number;
  startDate: Date | string;
  endDate: Date | string | null;
  isActive: boolean;
  patientId: string;
  dispenserId: string;
};

export type LiveDispenser = {
  id: string;
  serialNumber: string;
  status: DispenserStatus;
  ipAddress?: string;
  lastSeen?: string;
  lastUpdate?: string;
  version?: string;
  model?: string;
  capabilities?: {
    chambers?: number;
    hasRfid?: boolean;
    hasDisplay?: boolean;
  };
};

export type DispenserLog = {
  id: string;
  dispenserId: string;
  scheduleId: string;
  timestamp: Date | string;
  status: DispensingStatus;
  medications: string; // JSON string of dispensed medications
  synced: boolean;
  createdAt: Date | string;
  schedule: {
    time: number;
  };
};

export type PaginatedResponse<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type DispenserDetails = DispenserWithPatient & {
  chambers: Chamber[];
  schedules: {
    id: string;
    time: number;
    isActive: boolean;
    startDate: Date | string;
    endDate: Date | string | null;
  }[];
  rfids: {
    id: string;
    rfidTag: string;
    type: RfidType;
  }[];
  dispenserLogs: DispenserLog[];
};

export type DispenserFormData = {
  serialNumber: string;
  status: DispenserStatus;
};

export type DispenserFilterStatus = 'all' | 'assigned' | 'unassigned';
