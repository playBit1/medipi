// src/types/medication.ts
// TypeScript type definitions for medication-related data structures

export type Medication = {
  id: string;
  name: string;
  description: string | null;
  dosageUnit: string;
  stockLevel: number;
  stockThreshold: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type MedicationWithUsage = Medication & {
  usageCount: number; // Number of chambers using this medication
  dispenserCount: number; // Number of unique dispensers using this medication
};

export type MedicationWithDetails = Medication & {
  chambers: {
    id: string;
    chamberNumber: number;
    dispenser: {
      id: string;
      serialNumber: string;
      patient: {
        id: string;
        name: string;
      } | null;
    };
    schedule: {
      id: string;
      time: number;
      isActive: boolean;
    };
    dosageAmount: number;
    currentAmount: number;
  }[];
};

export type MedicationFormData = {
  name: string;
  description?: string;
  dosageUnit: string;
  stockLevel: number;
  stockThreshold: number;
};

export type StockAdjustment = {
  medicationId: string;
  amount: number;
  reason: StockAdjustmentReason;
  notes?: string;
};

export enum StockAdjustmentReason {
  RESTOCK = 'RESTOCK',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
  DISPENSED = 'DISPENSED',
  EXPIRED = 'EXPIRED',
  DAMAGED = 'DAMAGED',
  OTHER = 'OTHER',
}
