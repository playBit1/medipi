-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "roomNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dosageUnit" TEXT NOT NULL,
    "stockLevel" INTEGER NOT NULL DEFAULT 0,
    "stockThreshold" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Dispenser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serialNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "lastSeen" DATETIME,
    "patientId" TEXT,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Dispenser_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chamber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispenserId" TEXT NOT NULL,
    "chamberNumber" INTEGER NOT NULL,
    CONSTRAINT "Chamber_dispenserId_fkey" FOREIGN KEY ("dispenserId") REFERENCES "Dispenser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChamberContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chamberId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "dosageAmount" INTEGER NOT NULL,
    "currentAmount" INTEGER NOT NULL,
    CONSTRAINT "ChamberContent_chamberId_fkey" FOREIGN KEY ("chamberId") REFERENCES "Chamber" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChamberContent_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChamberContent_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "dispenserId" TEXT NOT NULL,
    "time" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Schedule_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Schedule_dispenserId_fkey" FOREIGN KEY ("dispenserId") REFERENCES "Dispenser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DispenserLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispenserId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "medications" TEXT NOT NULL,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DispenserLog_dispenserId_fkey" FOREIGN KEY ("dispenserId") REFERENCES "Dispenser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DispenserLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DispenserRfid" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispenserId" TEXT NOT NULL,
    "rfidTag" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DispenserRfid_dispenserId_fkey" FOREIGN KEY ("dispenserId") REFERENCES "Dispenser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Medication_name_key" ON "Medication"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Dispenser_serialNumber_key" ON "Dispenser"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Dispenser_patientId_key" ON "Dispenser"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Chamber_dispenserId_chamberNumber_key" ON "Chamber"("dispenserId", "chamberNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ChamberContent_chamberId_scheduleId_key" ON "ChamberContent"("chamberId", "scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_dispenserId_time_key" ON "Schedule"("dispenserId", "time");

-- CreateIndex
CREATE UNIQUE INDEX "DispenserRfid_rfidTag_key" ON "DispenserRfid"("rfidTag");
