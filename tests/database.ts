import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    console.log('\n=== TESTING DATABASE SETUP AND RELATIONSHIPS ===\n');

    // Test 1: Count all entities
    console.log('=== TEST 1: COUNT ALL ENTITIES ===');
    const userCount = await prisma.user.count();
    const patientCount = await prisma.patient.count();
    const medicationCount = await prisma.medication.count();
    const dispenserCount = await prisma.dispenser.count();
    const chamberCount = await prisma.chamber.count();
    const scheduleCount = await prisma.schedule.count();
    const chamberContentCount = await prisma.chamberContent.count();
    const dispenserLogCount = await prisma.dispenserLog.count();
    const rfidCount = await prisma.dispenserRfid.count();

    console.log(`Users: ${userCount}`);
    console.log(`Patients: ${patientCount}`);
    console.log(`Medications: ${medicationCount}`);
    console.log(`Dispensers: ${dispenserCount}`);
    console.log(`Chambers: ${chamberCount}`);
    console.log(`Schedules: ${scheduleCount}`);
    console.log(`Chamber Contents: ${chamberContentCount}`);
    console.log(`Dispenser Logs: ${dispenserLogCount}`);
    console.log(`RFID Tags: ${rfidCount}`);

    // Test 2: Check patient-dispenser relationship
    console.log('\n=== TEST 2: PATIENT-DISPENSER RELATIONSHIP ===');
    const patientsWithDispensers = await prisma.patient.findMany({
      select: {
        id: true,
        name: true,
        dispenser: {
          select: {
            id: true,
            serialNumber: true,
          },
        },
      },
    });

    patientsWithDispensers.forEach((patient) => {
      console.log(
        `Patient: ${patient.name} | Dispenser: ${
          patient.dispenser ? patient.dispenser.serialNumber : 'None'
        }`
      );
    });

    // Test 3: Check dispenser chambers
    console.log('\n=== TEST 3: DISPENSER CHAMBERS ===');
    const dispensersWithChambers = await prisma.dispenser.findMany({
      take: 2,
      select: {
        serialNumber: true,
        chambers: {
          select: {
            chamberNumber: true,
          },
          orderBy: {
            chamberNumber: 'asc',
          },
        },
      },
    });

    dispensersWithChambers.forEach((dispenser) => {
      console.log(
        `Dispenser ${dispenser.serialNumber} has ${dispenser.chambers.length} chambers:`
      );
      dispenser.chambers.forEach((chamber) => {
        console.log(`- Chamber ${chamber.chamberNumber}`);
      });
    });

    // Test 4: Check schedules with medications
    console.log('\n=== TEST 4: SCHEDULES WITH MEDICATIONS ===');
    const schedulesWithMedications = await prisma.schedule.findMany({
      take: 2,
      select: {
        id: true,
        time: true,
        patient: {
          select: {
            name: true,
          },
        },
        dispenser: {
          select: {
            serialNumber: true,
          },
        },
        chambers: {
          select: {
            chamber: {
              select: {
                chamberNumber: true,
              },
            },
            medication: {
              select: {
                name: true,
              },
            },
            dosageAmount: true,
          },
        },
      },
    });

    schedulesWithMedications.forEach((schedule) => {
      console.log(
        `Schedule for patient ${schedule.patient.name} on dispenser ${schedule.dispenser.serialNumber} at ${schedule.time}:00:`
      );
      schedule.chambers.forEach((content) => {
        console.log(
          `- Chamber ${content.chamber.chamberNumber}: ${content.medication.name}, Dosage: ${content.dosageAmount}`
        );
      });
    });

    // Test 5: Check dispenser logs
    console.log('\n=== TEST 5: DISPENSER LOGS ===');
    const recentLogs = await prisma.dispenserLog.findMany({
      take: 5,
      orderBy: {
        timestamp: 'desc',
      },
      select: {
        timestamp: true,
        status: true,
        dispenser: {
          select: {
            serialNumber: true,
          },
        },
        schedule: {
          select: {
            time: true,
            patient: {
              select: {
                name: true,
              },
            },
          },
        },
        synced: true,
      },
    });

    recentLogs.forEach((log) => {
      console.log(
        `${log.timestamp.toLocaleString()}: ${log.status} - Patient: ${
          log.schedule.patient.name
        }, ` +
          `Dispenser: ${log.dispenser.serialNumber}, Time: ${log.schedule.time}:00, Synced: ${log.synced}`
      );
    });

    // Test 6: Test the full chambers schedule
    console.log('\n=== TEST 6: FULL CHAMBERS SCHEDULE ===');
    const fullSchedule = await prisma.schedule.findFirst({
      where: {
        chambers: {
          some: {
            chamber: {
              chamberNumber: 6, // Looking for a schedule that uses chamber 6 (likely uses all chambers)
            },
          },
        },
      },
      select: {
        time: true,
        patient: {
          select: {
            name: true,
          },
        },
        chambers: {
          select: {
            chamber: {
              select: {
                chamberNumber: true,
              },
            },
            medication: {
              select: {
                name: true,
              },
            },
            dosageAmount: true,
          },
          orderBy: {
            chamber: {
              chamberNumber: 'asc',
            },
          },
        },
      },
    });

    if (fullSchedule) {
      console.log(
        `Schedule for ${fullSchedule.patient.name} at ${fullSchedule.time}:00 has ${fullSchedule.chambers.length} chambers:`
      );
      fullSchedule.chambers.forEach((content) => {
        console.log(
          `- Chamber ${content.chamber.chamberNumber}: ${content.medication.name}, Dosage: ${content.dosageAmount}`
        );
      });
    } else {
      console.log('No schedule using all chambers found.');
    }

    // Test 7: RFID tags
    console.log('\n=== TEST 7: RFID TAGS ===');
    const rfidTags = await prisma.dispenserRfid.findMany({
      take: 5,
      select: {
        rfidTag: true,
        type: true,
        dispenser: {
          select: {
            serialNumber: true,
            patient: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    rfidTags.forEach((rfid) => {
      console.log(
        `RFID: ${rfid.rfidTag} | Type: ${rfid.type} | Dispenser: ${rfid.dispenser.serialNumber} | ` +
          `Patient: ${
            rfid.dispenser.patient ? rfid.dispenser.patient.name : 'None'
          }`
      );
    });

    console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Error testing database relationships:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
