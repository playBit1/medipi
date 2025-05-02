// src/app/api/dashboard/recent-logs/route.ts
/*This endpoint fetches recent dispensing logs with related patient and dispenser information. 
It performs joined queries using Prisma, parses stored medication data, and formats everything into a structured response. 
This API route provides the data for the RecentLogs component. */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const recentLogs = await prisma.dispenserLog.findMany({
      take: 5,
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        dispenser: {
          include: {
            patient: true,
          },
        },
        schedule: true,
      },
    });

    const formattedLogs = recentLogs.map((log) => {
      const medications = JSON.parse(log.medications);

      return {
        id: log.id,
        timestamp: log.timestamp,
        status: log.status,
        patient: log.dispenser.patient ? log.dispenser.patient.name : 'Unknown',
        dispenserSerial: log.dispenser.serialNumber,
        medications: medications,
        scheduleTime: log.schedule.time,
      };
    });

    return NextResponse.json(formattedLogs);
  } catch (error) {
    console.error('Error fetching recent logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent logs' },
      { status: 500 }
    );
  }
}
