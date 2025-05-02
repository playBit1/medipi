// src/app/api/dashboard/stats/route.ts
/* This API route fetches system statistics from the database, including counts of patients, dispensers, medications, and alerts. 
It uses Prisma queries to gather data from multiple tables and returns a structured response. 
This endpoint provides the data needed by the StatusOverview component. */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get counts from the database
    const [
      totalPatients,
      totalDispensers,
      onlineDispensers,
      totalMedications,
      lowStockMedications,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.dispenser.count(),
      prisma.dispenser.count({
        where: { status: 'ONLINE' },
      }),
      prisma.medication.count(),
      prisma.medication.count({
        where: {
          stockLevel: {
            lt: prisma.medication.fields.stockThreshold,
          },
        },
      }),
    ]);

    return NextResponse.json({
      totalPatients,
      totalDispensers,
      onlineDispensers,
      totalMedications,
      lowStockMedications,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
