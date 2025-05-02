// src/types/dashboard.ts
/* This file contains TypeScript type definitions for dashboard-related data structures, including status counts, alerts, medication records, and dispenser logs. 
It provides strong typing for all dashboard components and API responses, enhancing code quality and developer experience through type safety. */
export type StatusCount = {
  totalPatients: number;
  totalDispensers: number;
  onlineDispensers: number;
  totalMedications: number;
  lowStockMedications: number;
};

export type AlertType = 'missed' | 'lowStock' | 'offline' | 'error';

export type Alert = {
  id: string;
  type: AlertType;
  message: string;
  timestamp: string;
  entity: {
    id: string;
    name: string;
    type: 'dispenser' | 'medication' | 'patient';
  };
};

export type Medication = {
  id: string;
  name: string;
  amount: number;
};

export type DispensingStatus = 'COMPLETED' | 'MISSED' | 'LATE' | 'ERROR';

export type DispenserLog = {
  id: string;
  timestamp: string;
  status: DispensingStatus;
  patient: string;
  dispenserSerial: string;
  medications: Medication[];
  scheduleTime: number;
};
