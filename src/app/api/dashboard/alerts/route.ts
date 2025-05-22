/*This API route retrieves and formats system alerts, including missed medications, low stock medications, and offline dispensers. 
It performs complex database queries with Prisma, transforms the data into a consistent alert format, and sorts results by recency. 
This endpoint supplies data for the AlertsList component. */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const alerts = [];

    // Find missed medication logs
    const missedMedications = await prisma.dispenserLog.findMany({
      where: {
        status: 'MISSED',
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      include: {
        dispenser: {
          include: {
            patient: true,
          },
        },
        schedule: true,
      },
      take: 10,
      orderBy: {
        timestamp: 'desc',
      },
    });

    for (const log of missedMedications) {
      if (log.dispenser.patient) {
        alerts.push({
          id: log.id,
          type: 'missed',
          message: `Missed medication at ${new Date(
            log.timestamp
          ).toLocaleTimeString()}`,
          timestamp: log.timestamp.toISOString(),
          entity: {
            id: log.dispenserId,
            name: `${log.dispenser.patient.name} (${log.dispenser.serialNumber})`,
            type: 'dispenser',
          },
        });
      }
    }

    // Find low stock medications
    const lowStockMeds = await prisma.medication.findMany({
      where: {
        stockLevel: {
          lt: prisma.medication.fields.stockThreshold,
        },
      },
      take: 10,
    });

    for (const med of lowStockMeds) {
      alerts.push({
        id: `med-${med.id}`,
        type: 'lowStock',
        message: `Stock level (${med.stockLevel}) below threshold (${med.stockThreshold})`,
        timestamp: new Date().toISOString(),
        entity: {
          id: med.id,
          name: med.name,
          type: 'medication',
        },
      });
    }

    // Find offline dispensers
    const offlineDispensers = await prisma.dispenser.findMany({
      where: {
        status: {
          in: ['OFFLINE', 'ERROR'],
        },
      },
      include: {
        patient: true,
      },
      take: 10,
    });

    for (const disp of offlineDispensers) {
      if (disp.patient) {
        alerts.push({
          id: `disp-${disp.id}`,
          type: disp.status === 'ERROR' ? 'error' : 'offline',
          message: `Dispenser is ${disp.status.toLowerCase()}`,
          timestamp: disp.lastSeen?.toISOString() || new Date().toISOString(),
          entity: {
            id: disp.id,
            name: `${disp.patient.name} (${disp.serialNumber})`,
            type: 'dispenser',
          },
        });
      }
    }

    // Sort all alerts by timestamp, newest first
    alerts.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(alerts.slice(0, 10)); // Return top 10 most recent alerts
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
