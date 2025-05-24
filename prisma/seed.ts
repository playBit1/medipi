import {
  PrismaClient,
  DispenserStatus,
  DispensingStatus,
  RfidType,
} from '../src/generated/prisma';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

interface MedicationData {
  name: string;
  description: string;
  dosageUnit: string;
  stockLevel: number;
  stockThreshold: number;
}

interface ChamberAssignment {
  chamberId: string;
  medicationId: string;
  dosageAmount: number;
}

async function main(): Promise<void> {
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
  const adminPassword: string = await hash('admin123', 10);
  const nursePassword: string = await hash('MedNurse123277655', 10);

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
      password: nursePassword,
      name: 'Head Nurse',
    },
  });

  console.log(`Created ${admin1.name} and ${admin2.name}`);

  // Create medications
  console.log('Creating medications...');
  const medicationData: MedicationData[] = [
    {
      name: 'Aspirin',
      description: 'Pain reliever and blood thinner',
      dosageUnit: 'pill',
      stockLevel: 100,
      stockThreshold: 20,
    },
    {
      name: 'Panadol',
      description: 'Paracetamol/Acetaminophen for pain and fever',
      dosageUnit: 'pill',
      stockLevel: 200,
      stockThreshold: 40,
    },
    {
      name: 'Ibuprofen',
      description: 'Anti-inflammatory pain reliever',
      dosageUnit: 'pill',
      stockLevel: 150,
      stockThreshold: 30,
    },
    {
      name: 'Lisinopril',
      description: 'ACE inhibitor for high blood pressure',
      dosageUnit: 'pill',
      stockLevel: 150,
      stockThreshold: 30,
    },
    {
      name: 'Metformin',
      description: 'Diabetes medication',
      dosageUnit: 'pill',
      stockLevel: 80,
      stockThreshold: 15,
    },
    {
      name: 'Atorvastatin',
      description: 'Cholesterol medication',
      dosageUnit: 'pill',
      stockLevel: 120,
      stockThreshold: 25,
    },
    {
      name: 'Levothyroxine',
      description: 'Thyroid hormone replacement',
      dosageUnit: 'pill',
      stockLevel: 90,
      stockThreshold: 20,
    },
    {
      name: 'Amoxicillin',
      description: 'Antibiotic',
      dosageUnit: 'pill',
      stockLevel: 50,
      stockThreshold: 10,
    },
    {
      name: 'Hydrochlorothiazide',
      description: 'Diuretic for high blood pressure',
      dosageUnit: 'pill',
      stockLevel: 75,
      stockThreshold: 15,
    },
    {
      name: 'Omeprazole',
      description: 'Acid reflux medication',
      dosageUnit: 'pill',
      stockLevel: 110,
      stockThreshold: 20,
    },
    {
      name: 'Vitamin D',
      description: 'Vitamin D3 supplement',
      dosageUnit: 'pill',
      stockLevel: 180,
      stockThreshold: 35,
    },
    {
      name: 'Multivitamin',
      description: 'Daily multivitamin supplement',
      dosageUnit: 'pill',
      stockLevel: 160,
      stockThreshold: 30,
    },
  ];

  const medications = await Promise.all(
    medicationData.map((data) => prisma.medication.create({ data }))
  );

  console.log(`Created ${medications.length} medications`);

  // Create patients
  console.log('Creating patients...');
  const patientData = [
    {
      name: 'John Doe',
      dateOfBirth: new Date('1950-05-15'),
      roomNumber: '101A',
    },
    {
      name: 'Jane Smith',
      dateOfBirth: new Date('1945-10-20'),
      roomNumber: '102B',
    },
    {
      name: 'Robert Johnson',
      dateOfBirth: new Date('1955-03-25'),
      roomNumber: '103C',
    },
    {
      name: 'Mary Williams',
      dateOfBirth: new Date('1960-12-10'),
      roomNumber: '104D',
    },
    {
      name: 'David Brown',
      dateOfBirth: new Date('1952-07-30'),
      roomNumber: '105E',
    },
    {
      name: 'Elizabeth Davis',
      dateOfBirth: new Date('1948-11-05'),
      roomNumber: null, // Testing null room number
    },
    {
      name: 'Binul Maneth',
      dateOfBirth: new Date('1965-08-22'),
      roomNumber: '106F',
    },
  ];

  const patients = await Promise.all(
    patientData.map((data) => prisma.patient.create({ data }))
  );

  console.log(`Created ${patients.length} patients:`);
  patients.forEach((patient, index) => {
    console.log(
      `  ${index + 1}. ${patient.name} - Room ${
        patient.roomNumber || 'Not assigned'
      }`
    );
  });

  // Use the first patient (John Doe) for our single dispenser
  const patient = patients[0];

  console.log(`Selected patient for dispenser: ${patient.name}`);

  // Create one dispenser with 6 chambers
  console.log('Creating dispenser...');
  const dispenser = await prisma.dispenser.create({
    data: {
      serialNumber: 'DISP001',
      status: DispenserStatus.OFFLINE,
      lastSeen: new Date(),
      patientId: patient.id,
    },
  });

  // Create 6 chambers for this dispenser
  const chambers = [];
  for (let i = 1; i <= 6; i++) {
    const chamber = await prisma.chamber.create({
      data: {
        dispenserId: dispenser.id,
        chamberNumber: i,
      },
    });
    chambers.push(chamber);
  }

  // Create RFID tags
  await prisma.dispenserRfid.create({
    data: {
      dispenserId: dispenser.id,
      rfidTag: `PATIENT-${dispenser.serialNumber}`,
      type: RfidType.PATIENT,
    },
  });

  await prisma.dispenserRfid.create({
    data: {
      dispenserId: dispenser.id,
      rfidTag: `ADMIN-${dispenser.serialNumber}`,
      type: RfidType.ADMIN,
    },
  });

  console.log(
    `Created dispenser ${dispenser.serialNumber} with 6 chambers and RFID tags`
  );

  // Create one schedule with medication assignments
  console.log('Creating schedule...');
  const schedule = await prisma.schedule.create({
    data: {
      dispenserId: dispenser.id,
      patientId: patient.id,
      time: 8, // 8:00 AM
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      isActive: true,
    },
  });

  // Create chamber content for the schedule
  // Use chambers 1, 2, and 3 with different medications including common ones
  const chamberAssignments: ChamberAssignment[] = [
    {
      chamberId: chambers[0].id,
      medicationId: medications[1].id,
      dosageAmount: 2,
    }, // Panadol
    {
      chamberId: chambers[1].id,
      medicationId: medications[3].id,
      dosageAmount: 1,
    }, // Lisinopril
    {
      chamberId: chambers[2].id,
      medicationId: medications[4].id,
      dosageAmount: 1,
    }, // Metformin
  ];

  for (const assignment of chamberAssignments) {
    await prisma.chamberContent.create({
      data: {
        chamberId: assignment.chamberId,
        medicationId: assignment.medicationId,
        scheduleId: schedule.id,
        dosageAmount: assignment.dosageAmount,
        currentAmount: 30, // Starting amount
      },
    });
  }

  console.log('Created schedule with medication assignments');

  // Create a few sample dispenser logs
  console.log('Creating sample logs...');
  const now: Date = new Date();
  const yesterday: Date = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo: Date = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  // Helper function to create a dispenser log
  async function createDispenserLog(
    timestamp: Date,
    status: DispensingStatus,
    synced: boolean
  ): Promise<void> {
    await prisma.dispenserLog.create({
      data: {
        dispenserId: dispenser.id,
        scheduleId: schedule.id,
        timestamp,
        status,
        medications: JSON.stringify([
          { id: medications[1].id, name: medications[1].name, amount: 2 }, // Panadol
          { id: medications[3].id, name: medications[3].name, amount: 1 }, // Lisinopril
          { id: medications[4].id, name: medications[4].name, amount: 1 }, // Metformin
        ]),
        synced,
      },
    });
  }

  // Create sample logs
  await createDispenserLog(twoDaysAgo, DispensingStatus.COMPLETED, true);
  await createDispenserLog(yesterday, DispensingStatus.COMPLETED, true);
  await createDispenserLog(now, DispensingStatus.COMPLETED, true);

  console.log('Created sample dispenser logs');

  console.log('Simplified database seeding completed successfully!');
  console.log('Summary:');
  console.log('- 2 admin users created');
  console.log(
    `- ${medications.length} medications created (including common ones like Panadol, Ibuprofen)`
  );
  console.log(`- ${patients.length} patients created`);
  console.log('- 1 dispenser with 6 chambers created (assigned to John Doe)');
  console.log('- 1 schedule with 3 medication assignments created');
  console.log('- 3 sample logs created');
}

main()
  .catch((error: Error) => {
    console.error('Error during database seeding:', error);
    process.exit(1);
  })
  .finally(async (): Promise<void> => {
    await prisma.$disconnect();
  });
