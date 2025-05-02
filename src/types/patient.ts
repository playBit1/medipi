import { DispenserStatus } from './dispenser';

export type Patient = {
  id: string;
  name: string;
  dateOfBirth: Date | string;
  roomNumber: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type PatientWithDispenser = Patient & {
  dispenser: {
    id: string;
    serialNumber: string;
    status: DispenserStatus;
  } | null;
};

export type PatientWithDetails = PatientWithDispenser & {
  schedules: {
    id: string;
    time: number;
    isActive: boolean;
    startDate: Date | string;
    endDate: Date | string | null;
    dispenser: {
      serialNumber: string;
    };
  }[];
};

export type PatientFormData = {
  name: string;
  dateOfBirth: string;
  roomNumber?: string;
};
