/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '../src/generated/prisma';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Clean up existing data if needed
  console.log('Cleaning up existing data...');
  await prisma.dispenserLog.deleteMany({});
  await prisma.chamberContent.deleteMany({});
  await prisma.chamber.deleteMany({});
  await prisma.schedule.deleteMany({});
  await prisma.dispenserRfid.deleteMany({});
  await prisma.dispenser.deleteMany({});
  await prisma.medication.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.user.deleteMany({});

  // Create admin users
  console.log('Creating admin users...');
  const adminPassword = await hash('admin123', 10);

  const admin1 = await prisma.user.create({
    data: {
      email: 'admin@medipi.com',
      password: adminPassword,
      name: 'System Administrator',
    },
  });

  const admin2 = await prisma.user.create({
    data: {
      email: 'nurse@medipi.com',
      password: adminPassword,
      name: 'Head Nurse',
    },
  });

  console.log(`Created ${admin1.name} and ${admin2.name}`);

  // Create medications
  console.log('Creating medications...');
  const medications = await Promise.all([
    prisma.medication.create({
      data: {
        name: 'Aspirin',
        description: 'Pain reliever',
        dosageUnit: 'pill',
        stockLevel: 100,
        stockThreshold: 20,
      },
    }),
    prisma.medication.create({
      data: {
        name: 'Lisinopril',
        description: 'ACE inhibitor for high blood pressure',
        dosageUnit: 'pill',
        stockLevel: 150,
        stockThreshold: 30,
      },
    }),
    prisma.medication.create({
      data: {
        name: 'Metformin',
        description: 'Diabetes medication',
        dosageUnit: 'pill',
        stockLevel: 80,
        stockThreshold: 15,
      },
    }),
    prisma.medication.create({
      data: {
        name: 'Atorvastatin',
        description: 'Cholesterol medication',
        dosageUnit: 'pill',
        stockLevel: 120,
        stockThreshold: 25,
      },
    }),
    prisma.medication.create({
      data: {
        name: 'Levothyroxine',
        description: 'Thyroid hormone replacement',
        dosageUnit: 'pill',
        stockLevel: 90,
        stockThreshold: 20,
      },
    }),
    prisma.medication.create({
      data: {
        name: 'Amoxicillin',
        description: 'Antibiotic',
        dosageUnit: 'pill',
        stockLevel: 50,
        stockThreshold: 10,
      },
    }),
    prisma.medication.create({
      data: {
        name: 'Hydrochlorothiazide',
        description: 'Diuretic for high blood pressure',
        dosageUnit: 'pill',
        stockLevel: 75,
        stockThreshold: 15,
      },
    }),
    prisma.medication.create({
      data: {
        name: 'Omeprazole',
        description: 'Acid reflux medication',
        dosageUnit: 'pill',
        stockLevel: 110,
        stockThreshold: 20,
      },
    }),
  ]);

  console.log(`Created ${medications.length} medications`);

  // Create patients
  console.log('Creating patients...');
  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        name: 'John Doe',
        dateOfBirth: new Date('1950-05-15'),
        roomNumber: '101A',
      },
    }),
    prisma.patient.create({
      data: {
        name: 'Jane Smith',
        dateOfBirth: new Date('1945-10-20'),
        roomNumber: '102B',
      },
    }),
    prisma.patient.create({
      data: {
        name: 'Robert Johnson',
        dateOfBirth: new Date('1955-03-25'),
        roomNumber: '103C',
      },
    }),
    prisma.patient.create({
      data: {
        name: 'Mary Williams',
        dateOfBirth: new Date('1960-12-10'),
        roomNumber: '104D',
      },
    }),
    prisma.patient.create({
      data: {
        name: 'David Brown',
        dateOfBirth: new Date('1952-07-30'),
        roomNumber: '105E',
      },
    }),
    prisma.patient.create({
      data: {
        name: 'Elizabeth Davis',
        dateOfBirth: new Date('1948-11-05'),
        roomNumber: null, // Testing null room number
      },
    }),
  ]);

  console.log(`Created ${patients.length} patients`);

  // Create dispensers
  console.log('Creating dispensers...');

  // Helper function to create a dispenser with 6 chambers
  async function createDispenserWithChambers(
    serialNumber: string,
    status: string,
    patientId?: string
  ) {
    const dispenser = await prisma.dispenser.create({
      data: {
        serialNumber,
        status: status as any,
        lastSeen: status === 'ONLINE' ? new Date() : null,
        patientId: patientId || null,
      },
    });

    // Create 6 chambers for this dispenser
    for (let i = 1; i <= 6; i++) {
      await prisma.chamber.create({
        data: {
          dispenserId: dispenser.id,
          chamberNumber: i,
        },
      });
    }

    // Create RFID tags (one for patient, one for admin)
    if (patientId) {
      await prisma.dispenserRfid.create({
        data: {
          dispenserId: dispenser.id,
          rfidTag: `PATIENT-${serialNumber}`,
          type: 'PATIENT',
        },
      });
    }

    await prisma.dispenserRfid.create({
      data: {
        dispenserId: dispenser.id,
        rfidTag: `ADMIN-${serialNumber}`,
        type: 'ADMIN',
      },
    });

    return dispenser;
  }

  // Create dispensers with different statuses and patient assignments
  const dispenser1 = await createDispenserWithChambers(
    'DISP001',
    'ONLINE',
    patients[0].id
  );
  const dispenser2 = await createDispenserWithChambers(
    'DISP002',
    'ONLINE',
    patients[1].id
  );
  const dispenser3 = await createDispenserWithChambers(
    'DISP003',
    'OFFLINE',
    patients[2].id
  );
  const dispenser4 = await createDispenserWithChambers(
    'DISP004',
    'MAINTENANCE',
    patients[3].id
  );
  const dispenser5 = await createDispenserWithChambers(
    'DISP005',
    'ERROR',
    patients[4].id
  );
  const dispenser6 = await createDispenserWithChambers(
    'DISP006',
    'OFFLINE_AUTONOMOUS',
    patients[5].id
  );

  // Create one unassigned dispenser
  await createDispenserWithChambers('DISP007', 'ONLINE');

  console.log(`Created 7 dispensers with chambers and RFID tags`);

  // Get all chambers
  const chambers = await prisma.chamber.findMany();

  // Helper function to group chambers by dispenser
  const chambersByDispenser = chambers.reduce((acc, chamber) => {
    if (!acc[chamber.dispenserId]) {
      acc[chamber.dispenserId] = [];
    }
    acc[chamber.dispenserId].push(chamber);
    return acc;
  }, {} as Record<string, typeof chambers>);

  // Create schedules with chamber content
  console.log('Creating schedules and chamber content...');

  // Helper function to create a schedule with medication assignments
  async function createSchedule(
    dispenserId: string,
    patientId: string,
    time: number,
    medicationAssignments: Array<{
      medicationId: string;
      chamberNumber: number;
      dosageAmount: number;
    }>
  ) {
    const schedule = await prisma.schedule.create({
      data: {
        dispenserId,
        patientId,
        time,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isActive: true,
      },
    });

    // Find dispenser chambers
    const dispenserChambers = chambersByDispenser[dispenserId];

    // Create chamber content for each medication assignment
    for (const assignment of medicationAssignments) {
      const chamber = dispenserChambers.find(
        (c) => c.chamberNumber === assignment.chamberNumber
      );

      if (chamber) {
        await prisma.chamberContent.create({
          data: {
            chamberId: chamber.id,
            medicationId: assignment.medicationId,
            scheduleId: schedule.id,
            dosageAmount: assignment.dosageAmount,
            currentAmount: 30, // Starting amount
          },
        });
      }
    }

    return schedule;
  }

  // Create schedules for dispenser 1 (multiple times a day)
  await createSchedule(dispenser1.id, patients[0].id, 8, [
    { medicationId: medications[0].id, chamberNumber: 1, dosageAmount: 1 },
    { medicationId: medications[1].id, chamberNumber: 2, dosageAmount: 2 },
  ]);

  await createSchedule(dispenser1.id, patients[0].id, 13, [
    { medicationId: medications[0].id, chamberNumber: 1, dosageAmount: 1 },
    { medicationId: medications[2].id, chamberNumber: 3, dosageAmount: 1 },
  ]);

  await createSchedule(dispenser1.id, patients[0].id, 20, [
    { medicationId: medications[1].id, chamberNumber: 2, dosageAmount: 2 },
    { medicationId: medications[3].id, chamberNumber: 4, dosageAmount: 1 },
  ]);

  // Create schedule for dispenser 2
  await createSchedule(dispenser2.id, patients[1].id, 9, [
    { medicationId: medications[4].id, chamberNumber: 1, dosageAmount: 1 },
    { medicationId: medications[5].id, chamberNumber: 2, dosageAmount: 2 },
  ]);

  await createSchedule(dispenser2.id, patients[1].id, 21, [
    { medicationId: medications[4].id, chamberNumber: 1, dosageAmount: 1 },
    { medicationId: medications[6].id, chamberNumber: 3, dosageAmount: 1 },
  ]);

  // Create schedule for dispenser 3
  await createSchedule(dispenser3.id, patients[2].id, 10, [
    { medicationId: medications[7].id, chamberNumber: 1, dosageAmount: 1 },
    { medicationId: medications[2].id, chamberNumber: 2, dosageAmount: 2 },
  ]);

  // Create schedule for dispenser 4
  await createSchedule(dispenser4.id, patients[3].id, 8, [
    { medicationId: medications[3].id, chamberNumber: 1, dosageAmount: 1 },
    { medicationId: medications[5].id, chamberNumber: 2, dosageAmount: 1 },
  ]);

  // Create schedule for dispenser 5
  await createSchedule(dispenser5.id, patients[4].id, 9, [
    { medicationId: medications[6].id, chamberNumber: 1, dosageAmount: 1 },
    { medicationId: medications[0].id, chamberNumber: 2, dosageAmount: 2 },
  ]);

  // Create schedule for dispenser 6 using all 6 chambers
  await createSchedule(dispenser6.id, patients[5].id, 10, [
    { medicationId: medications[0].id, chamberNumber: 1, dosageAmount: 1 },
    { medicationId: medications[1].id, chamberNumber: 2, dosageAmount: 2 },
    { medicationId: medications[2].id, chamberNumber: 3, dosageAmount: 1 },
    { medicationId: medications[3].id, chamberNumber: 4, dosageAmount: 1 },
    { medicationId: medications[4].id, chamberNumber: 5, dosageAmount: 1 },
    { medicationId: medications[5].id, chamberNumber: 6, dosageAmount: 2 },
  ]);

  console.log('Created schedules with chamber content');

  // Create dispenser logs
  console.log('Creating dispenser logs...');

  // Get all schedules
  const schedules = await prisma.schedule.findMany();

  // Create some logs for testing
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  // Helper function to create a dispenser log
  async function createDispenserLog(
    dispenserId: string,
    scheduleId: string,
    timestamp: Date,
    status: string,
    synced: boolean
  ) {
    return prisma.dispenserLog.create({
      data: {
        dispenserId,
        scheduleId,
        timestamp,
        status: status as any,
        medications: JSON.stringify([
          { id: medications[0].id, name: medications[0].name, amount: 1 },
          { id: medications[1].id, name: medications[1].name, amount: 2 },
        ]),
        synced,
      },
    });
  }

  // Create logs for dispenser 1
  await createDispenserLog(
    dispenser1.id,
    schedules[0].id,
    twoDaysAgo,
    'COMPLETED',
    true
  );
  await createDispenserLog(
    dispenser1.id,
    schedules[0].id,
    yesterday,
    'COMPLETED',
    true
  );
  await createDispenserLog(
    dispenser1.id,
    schedules[0].id,
    now,
    'COMPLETED',
    true
  );

  await createDispenserLog(
    dispenser1.id,
    schedules[1].id,
    twoDaysAgo,
    'MISSED',
    true
  );
  await createDispenserLog(
    dispenser1.id,
    schedules[1].id,
    yesterday,
    'COMPLETED',
    true
  );

  await createDispenserLog(
    dispenser1.id,
    schedules[2].id,
    twoDaysAgo,
    'LATE',
    true
  );

  // Create logs for dispenser 2
  await createDispenserLog(
    dispenser2.id,
    schedules[3].id,
    yesterday,
    'COMPLETED',
    true
  );
  await createDispenserLog(
    dispenser2.id,
    schedules[4].id,
    yesterday,
    'COMPLETED',
    true
  );

  // Create logs for offline dispensers (not synced)
  await createDispenserLog(
    dispenser3.id,
    schedules[5].id,
    yesterday,
    'COMPLETED',
    false
  );
  await createDispenserLog(
    dispenser6.id,
    schedules[6].id,
    yesterday,
    'ERROR',
    false
  );

  console.log('Created dispenser logs');

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
