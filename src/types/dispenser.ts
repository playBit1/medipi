export enum DispenserStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR',
  OFFLINE_AUTONOMOUS = 'OFFLINE_AUTONOMOUS',
}

export type Dispenser = {
  id: string;
  serialNumber: string;
  status: DispenserStatus;
  lastSeen: Date | string | null;
  patientId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type DispenserWithPatient = Dispenser & {
  patient: {
    id: string;
    name: string;
  } | null;
};

export type DispenserDetails = DispenserWithPatient & {
  chambers: {
    id: string;
    chamberNumber: number;
  }[];
  schedules: {
    id: string;
    time: number;
    isActive: boolean;
  }[];
  rfids: {
    id: string;
    rfidTag: string;
    type: 'PATIENT' | 'ADMIN';
  }[];
};
