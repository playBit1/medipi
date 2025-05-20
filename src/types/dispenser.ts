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

export type DispenserLog = {
  id: string;
  dispenserId: string;
  scheduleId: string;
  timestamp: Date | string;
  status: DispensingStatus;
  medications: string; // JSON string of dispensed medications since the log is only for viewing
  synced: boolean;
  createdAt: Date | string;
  schedule: {
    time: number;
  };
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
